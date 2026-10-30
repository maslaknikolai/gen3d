# Runpod Serverless worker: image -> coarse mesh (Hunyuan3D-2 mini) -> Hi3D v1.0 refine -> GLB.
# Follows the upstream Hi3Dv1.0 docker/Dockerfile stack: Python 3.10, torch 2.5.0+cu124.
FROM nvcr.io/nvidia/cuda:12.4.1-devel-ubuntu22.04

ARG HI3D_REF=13657ad09afaa92e350b461a1cd66399e44a59c4
ARG HUNYUAN_REF=f8db63096c8282cb27354314d896feba5ba6ff8a
# Prebuilt flash-attn for Python 3.10 / torch 2.5 / CUDA 12, so it is never compiled.
ARG FLASH_ATTN_WHEEL=https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.5cxx11abiFALSE-cp310-cp310-linux_x86_64.whl

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/models/hf \
    U2NET_HOME=/models/u2net \
    PYTHONPATH=/opt/hunyuan:/opt/hi3d/demo

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-dev git ca-certificates build-essential ninja-build \
        libgl1 libglib2.0-0 libopengl0 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && pip3 install --upgrade pip setuptools wheel

# Weights (~15 GB) baked into the image, so a cold start downloads nothing. Done early so
# a later pip or code change reuses this cached layer instead of downloading again.
RUN pip3 install "huggingface-hub<1" && python -c "\
from huggingface_hub import snapshot_download as d; \
d('hi3d-official/Hi3Dv1.0', allow_patterns=['model_index.json', 'scheduler/*', 'vae/*', 'transformer_512/*', 'transformer_1024/*']); \
d('tencent/Hunyuan3D-2mini', allow_patterns=['hunyuan3d-dit-v2-mini-turbo/config.yaml', 'hunyuan3d-dit-v2-mini-turbo/model.fp16.safetensors']); \
d('facebook/dinov2-large', allow_patterns=['*.json', '*.txt', 'model.safetensors']); \
d('openai/clip-vit-large-patch14', allow_patterns=['*.json', '*.txt', 'model.safetensors'])"

RUN git clone https://github.com/hi3d-official/Hi3Dv1.0.git /opt/hi3d && git -C /opt/hi3d checkout ${HI3D_REF} \
    && git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git /opt/hunyuan && git -C /opt/hunyuan checkout ${HUNYUAN_REF}

# Set only now: pip fails on every install while this file does not exist yet.
ENV PIP_CONSTRAINT=/opt/hi3d/docker/constraints.txt

RUN pip3 install --extra-index-url https://download.pytorch.org/whl/cu124 \
        torch==2.5.0+cu124 torchvision==0.20.0+cu124

RUN pip3 install "${FLASH_ATTN_WHEEL}" \
    && pip3 install "/opt/hi3d[inference,demo]" onnxruntime

# hy3dgen is used from PYTHONPATH, not pip-installed: its setup.py wants transformers>=4.48,
# which conflicts with Hi3D's pinned 4.46.3. These are its shapegen imports (docs/installation.md).
# diffusers pinned: newer releases call torch.accelerator, which torch 2.5 does not have.
RUN pip3 install einops diffusers==0.32.2 opencv-python-headless pymeshlab scikit-image tqdm pyyaml runpod \
    && python -c "import rembg; rembg.new_session()"

# PYTHONFAULTHANDLER prints a stack trace if the process crashes in native code.
ENV HF_HUB_OFFLINE=1 PYTHONFAULTHANDLER=1

COPY handler.py /handler.py

CMD ["python", "-u", "/handler.py"]

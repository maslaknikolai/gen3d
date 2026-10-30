# Runpod Serverless worker: image -> coarse mesh (Hunyuan3D-2 mini) -> Hi3D v1.0 refine -> GLB.
# Follows the upstream Hi3Dv1.0 docker/Dockerfile stack: Python 3.10, torch 2.5.0+cu124.
FROM nvcr.io/nvidia/cuda:12.4.1-devel-ubuntu22.04

ARG HI3D_REF=13657ad09afaa92e350b461a1cd66399e44a59c4
ARG HUNYUAN_REF=f8db63096c8282cb27354314d896feba5ba6ff8a
# 9.0 = H100/H200. Add 8.0 (A100) or 8.9 (L40S, 4090) to run on other cards.
ARG TORCH_CUDA_ARCH_LIST="9.0"
# FALSE: take the prebuilt flash-attn wheel from GitHub, compile only if none matches.
ARG FLASH_ATTENTION_FORCE_BUILD=FALSE

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    TORCH_CUDA_ARCH_LIST=${TORCH_CUDA_ARCH_LIST} \
    MAX_JOBS=16 \
    PYTHONPATH=/opt/hunyuan:/opt/hi3d/demo

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-dev git ca-certificates build-essential ninja-build \
        libgl1 libglib2.0-0 libopengl0 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && pip3 install --upgrade pip setuptools wheel

RUN git clone https://github.com/hi3d-official/Hi3Dv1.0.git /opt/hi3d && git -C /opt/hi3d checkout ${HI3D_REF} \
    && git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git /opt/hunyuan && git -C /opt/hunyuan checkout ${HUNYUAN_REF}

# Set only now: pip fails on every install while this file does not exist yet.
ENV PIP_CONSTRAINT=/opt/hi3d/docker/constraints.txt

RUN pip3 install --extra-index-url https://download.pytorch.org/whl/cu124 \
        torch==2.5.0+cu124 torchvision==0.20.0+cu124

RUN pip3 install packaging ninja psutil \
    && FLASH_ATTENTION_FORCE_BUILD=${FLASH_ATTENTION_FORCE_BUILD} \
       pip3 install --no-build-isolation flash-attn==2.7.4.post1 \
    && pip3 install "/opt/hi3d[inference,demo]" onnxruntime

# hy3dgen is used from PYTHONPATH, not pip-installed: its setup.py wants transformers>=4.48,
# which conflicts with Hi3D's pinned 4.46.3. These are its shapegen imports (docs/installation.md).
RUN pip3 install einops diffusers opencv-python-headless pymeshlab scikit-image tqdm pyyaml runpod

COPY handler.py /handler.py

CMD ["python", "-u", "/handler.py"]

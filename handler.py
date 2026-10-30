"""Runpod Serverless handler: one image in, one refined GLB mesh out.

Input:  {"image": "<base64 png/jpg, data: prefix allowed>" | "image_url": "https://...",
         "resolution": 512 | 1024 | 1536, "seed": 0, "num_inference_steps": 25,
         "remove_background": false}
Output: {"glb_url": "..."} when BUCKET_* env is set, else {"glb_base64": "..."}; plus "resolution".
"""

import base64
import io
import os
import tempfile
import urllib.request

import runpod
import torch
from PIL import Image
from runpod.serverless.utils import rp_upload

from coarse_stage import generate_coarse_mesh, load_coarse_generator
from sparc3d import Sparc3DPipeline
from sparc3d.utils.image import remove_background

# Loaded once per worker. The coarse model waits on the CPU so the refiner gets the
# whole GPU, as in Hi3D's demo/image_to_mesh.py.
print("loading coarse model (Hunyuan3D-2 mini)")
coarse = load_coarse_generator(device="cuda")
coarse.to("cpu")  # Hunyuan's .to() returns None, so no chaining
print("loading refiner (Hi3D v1.0)")
refiner = Sparc3DPipeline.from_pretrained("hi3d-official/Hi3Dv1.0").to("cuda")
print("models loaded, starting worker")


def load_image(job_input: dict) -> Image.Image:
    if job_input.get("image_url"):
        with urllib.request.urlopen(job_input["image_url"], timeout=60) as resp:
            return Image.open(io.BytesIO(resp.read()))
    data = job_input.get("image")
    if not data:
        raise ValueError("provide 'image' (base64) or 'image_url'")
    return Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[-1])))


def handler(job):
    job_input = job["input"]
    resolution = int(job_input.get("resolution", 1024))
    if resolution not in (512, 1024, 1536):
        return {"error": "resolution must be 512, 1024 or 1536"}
    seed = int(job_input.get("seed", 0))
    steps = int(job_input.get("num_inference_steps", 25))

    try:
        image = load_image(job_input)
    except Exception as e:
        return {"error": f"bad image: {e}"}
    if job_input.get("remove_background"):
        image = remove_background(image)

    coarse.to("cuda")
    try:
        coarse_mesh = generate_coarse_mesh(coarse, image, seed)
    finally:
        coarse.to("cpu")
        torch.cuda.empty_cache()

    result = refiner(image, coarse_mesh, resolution=resolution, num_inference_steps=steps, seed=seed)

    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, f"{job['id']}.glb")
        result.mesh.export(path)
        if os.environ.get("BUCKET_ENDPOINT_URL"):
            return {"glb_url": rp_upload.upload_file_to_bucket(f"{job['id']}.glb", path),
                    "resolution": result.resolution}
        # ponytail: base64 in the job result, fine for small meshes; big 1536 meshes can
        # pass Runpod's result size limit, so set BUCKET_* env to upload to S3 instead.
        with open(path, "rb") as f:
            return {"glb_base64": base64.b64encode(f.read()).decode(), "resolution": result.resolution}


runpod.serverless.start({"handler": handler})

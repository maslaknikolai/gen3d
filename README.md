# gen3d

Image to 3D mesh: Hunyuan3D-2 mini makes a rough mesh, [Hi3D v1.0](https://huggingface.co/hi3d-official/Hi3Dv1.0) refines it, the result is a `.glb`.
Runs on a Runpod Serverless endpoint (H200, scales to zero).

| Folder | What |
|---|---|
| `runpod/` | GPU worker: `Dockerfile`, `handler.py`, and the endpoint settings for reference (`endpoint.json`) |
| `server/` | Express server that keeps the Runpod API key and forwards jobs |
| `client/` | Web page: upload an image, wait for the job, view and download the mesh |

## Run the server

```bash
cp .env.example .env   # fill in RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID
cd server
npm install
npm start              # http://localhost:3000
npm run typecheck
```

## Deploy the server on Railway

`railway.json` builds `server/Dockerfile` from the repo root. In the Railway service, leave Root Directory
empty (the repo root) and set the variables `RUNPOD_API_KEY` and `RUNPOD_ENDPOINT_ID`. Railway sets `PORT`.

`server/meshes/` is on the container disk, so a redeploy wipes it. Add a Railway volume at `/app/server/meshes`
to keep the meshes.

## Worker image

Runpod builds `runpod/Dockerfile` from GitHub on every push to the branch `_branch_to_trigger_runpad_rebuild`
(a push to `main` does not start a build). To rebuild the worker from `main`:

```bash
git push origin main:_branch_to_trigger_runpad_rebuild
```

The build context is the repo root, so the Dockerfile path in the endpoint's Repository Configuration
must be `runpod/Dockerfile`. The branch and the path can only be set in the Runpod console.

Endpoint: `gen3d`, id `ksi4f805wsqkoe`.

# gen3d

Image to 3D mesh: Hunyuan3D-2 mini makes a rough mesh, Hi3D v1.0 refines it, the result is a `.glb`.
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

## Worker image

Runpod builds `runpod/Dockerfile` from GitHub on every push to `main`. The build context is the repo root,
so the Dockerfile path in the endpoint's Repository Configuration must be `runpod/Dockerfile`.
That path can only be set in the Runpod console.

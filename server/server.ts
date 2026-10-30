// Small proxy in front of the Runpod endpoint, so the API key stays on the server.
// Also serves the page in ../client. Run: cd server && npm start
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const PORT = Number(process.env.PORT ?? 3000);
const RESOLUTIONS = [512, 1024, 1536];

if (!API_KEY) {
  throw new Error("RUNPOD_API_KEY is not set (put it in .env)");
}
if (!ENDPOINT_ID) {
  throw new Error("RUNPOD_ENDPOINT_ID is not set (put it in .env)");
}

const RUNPOD_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

// Finished meshes are saved here as <job id>.glb.
// ponytail: files are never deleted; add a cleanup if the folder grows too big.
const MESH_DIR = new URL("./meshes/", import.meta.url).pathname;
mkdirSync(MESH_DIR, { recursive: true });

function meshPath(id: string): string {
  return `${MESH_DIR}${id}.glb`;
}

type JobOutput = { glb_base64?: string; glb_url?: string; resolution?: number };
type RunpodJob = { id: string; status: string; output?: JobOutput; error?: string };

async function runpod(path: string, body?: unknown): Promise<RunpodJob> {
  const res = await fetch(RUNPOD_URL + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Runpod ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<RunpodJob>;
}

const app = express();
app.use(express.json({ limit: "20mb" }));

app.use(express.static(new URL("../client", import.meta.url).pathname));

app.post("/api/jobs", async (req, res) => {
  const { image, resolution = 1024 } = req.body ?? {};
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "image must be an image data URL" });
  }
  if (!RESOLUTIONS.includes(resolution)) {
    return res.status(400).json({ error: `resolution must be one of ${RESOLUTIONS.join(", ")}` });
  }
  const job = await runpod("/run", { input: { image, resolution } });
  res.json({ id: job.id });
});

// Job ids go into the Runpod URL, so only allow plain id characters.
app.param("id", (_req, res, next, id: string) => {
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: "bad job id" });
  }
  next();
});

app.get("/api/jobs/:id", async (req, res) => {
  const id = req.params.id;
  const modelUrl = `/api/jobs/${id}/model.glb`;
  if (existsSync(meshPath(id))) {
    return res.json({ status: "COMPLETED", modelUrl });
  }

  const job = await runpod(`/status/${id}`);
  if (job.status !== "COMPLETED") {
    return res.json({ status: job.status, error: job.error });
  }

  const output = job.output ?? {};
  if (output.glb_url) {
    return res.json({ status: job.status, modelUrl: output.glb_url, resolution: output.resolution });
  }
  if (!output.glb_base64) {
    return res.json({ status: "FAILED", error: "job finished without a mesh" });
  }

  await writeFile(meshPath(id), Buffer.from(output.glb_base64, "base64"));
  res.json({ status: job.status, modelUrl, resolution: output.resolution });
});

app.get("/api/jobs/:id/model.glb", (req, res) => {
  const path = meshPath(req.params.id);
  if (!existsSync(path)) {
    return res.status(404).json({ error: "mesh not found" });
  }
  res.type("model/gltf-binary").sendFile(path);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT} -> Runpod endpoint ${ENDPOINT_ID}`));

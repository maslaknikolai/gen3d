// Small proxy in front of the Runpod endpoint, so the API key stays on the server.
// Also serves the built page in ../client/dist (cd client && npm run build). Run: cd server && npm start
import express, { type NextFunction, type Request, type Response } from "express";

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const PORT = Number(process.env.PORT ?? 3000);
const RESOLUTIONS = [512, 1024, 1536];

const REQUIRED = [
  "RUNPOD_API_KEY",
  "RUNPOD_ENDPOINT_ID",
  "BUCKET_ENDPOINT_URL",
  "BUCKET_ACCESS_KEY_ID",
  "BUCKET_SECRET_ACCESS_KEY",
  "BUCKET_NAME",
];
for (const name of REQUIRED) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set (see .env.example)`);
  }
}

const RUNPOD_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

type S3Config = { endpointUrl: string; accessId: string; accessSecret: string; bucketName: string };

// Sent with each job: the worker uploads the mesh to this bucket and returns a link,
// because the mesh is too big for the job result.
const s3Config: S3Config = {
  endpointUrl: process.env.BUCKET_ENDPOINT_URL!,
  accessId: process.env.BUCKET_ACCESS_KEY_ID!,
  accessSecret: process.env.BUCKET_SECRET_ACCESS_KEY!,
  bucketName: process.env.BUCKET_NAME!,
};

type JobOutput = { glb_url?: string; resolution?: number };
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

app.use(express.static(new URL("../client/dist", import.meta.url).pathname));

app.post("/api/jobs", async (req, res) => {
  const { image, resolution = 1024 } = req.body ?? {};
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "image must be an image data URL" });
  }
  if (!RESOLUTIONS.includes(resolution)) {
    return res.status(400).json({ error: `resolution must be one of ${RESOLUTIONS.join(", ")}` });
  }
  const job = await runpod("/run", { input: { image, resolution }, s3Config });
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
  const job = await runpod(`/status/${req.params.id}`);
  if (job.status !== "COMPLETED") {
    return res.json({ status: job.status, error: job.error });
  }
  const output = job.output ?? {};
  if (!output.glb_url) {
    return res.json({ status: "FAILED", error: "job finished without a mesh" });
  }
  res.json({ status: job.status, modelUrl: output.glb_url, resolution: output.resolution });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT} -> Runpod endpoint ${ENDPOINT_ID}`));

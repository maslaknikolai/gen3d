import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import express, { type NextFunction, type Request, type Response } from "express";
import { callRunpod, getHealth, readWorkerLogs } from "./runpod.ts";

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

type S3Config = { endpointUrl: string; accessId: string; accessSecret: string; bucketName: string };

const s3Config: S3Config = {
  endpointUrl: process.env.BUCKET_ENDPOINT_URL!,
  accessId: process.env.BUCKET_ACCESS_KEY_ID!,
  accessSecret: process.env.BUCKET_SECRET_ACCESS_KEY!,
  bucketName: process.env.BUCKET_NAME!,
};

const s3 = new S3Client({
  endpoint: s3Config.endpointUrl,
  region: "auto",
  credentials: { accessKeyId: s3Config.accessId, secretAccessKey: s3Config.accessSecret },
});
const LINK_SECONDS = 60 * 60;

function signUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Config.bucketName, Key: key }), {
    expiresIn: LINK_SECONDS,
  });
}

type Generation = { id: string; createdAt: string; imageUrl: string; modelUrl?: string };

const app = express();
app.use(express.json({ limit: "20mb" }));

const CLIENT_DIST = new URL("../client/dist", import.meta.url).pathname;
app.use(express.static(CLIENT_DIST));

app.post("/api/jobs", async (req, res) => {
  const { image, resolution = 1024 } = req.body ?? {};
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "image must be an image data URL" });
  }
  if (!RESOLUTIONS.includes(resolution)) {
    return res.status(400).json({ error: `resolution must be one of ${RESOLUTIONS.join(", ")}` });
  }
  const job = await callRunpod("/run", { input: { image, resolution }, s3Config });
  const [header, data] = image.split(",", 2);
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: `${job.id}.image`,
      Body: Buffer.from(data, "base64"),
      ContentType: header.slice("data:".length).split(";")[0],
    }),
  );
  res.json({ id: job.id });
});

app.get("/api/health", async (_req, res) => {
  res.json(await getHealth());
});

// ponytail: reads one page (up to 1000 files, so about 500 generations); page through when it grows.
app.get("/api/generations", async (_req, res) => {
  const list = await s3.send(new ListObjectsV2Command({ Bucket: s3Config.bucketName }));
  const files = list.Contents ?? [];
  const keys = new Set(files.map((f) => f.Key));
  const images = files.filter((f) => f.Key?.endsWith(".image"));
  images.sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0));
  const generations = await Promise.all(
    images.map(async (f): Promise<Generation> => {
      const id = f.Key!.slice(0, -".image".length);
      const modelKey = `${id}.glb`;
      return {
        id,
        createdAt: f.LastModified!.toISOString(),
        imageUrl: await signUrl(f.Key!),
        // The bucket sends no CORS headers.
        modelUrl: keys.has(modelKey) ? `/api/generations/${id}/model.glb` : undefined,
      } satisfies Generation;
    }),
  );
  res.json(generations);
});

app.param("id", (_req, res, next, id: string) => {
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: "bad job id" });
  }
  next();
});

app.get("/api/jobs/:id", async (req, res) => {
  const job = await callRunpod(`/status/${req.params.id}`);
  const info = {
    workerId: job.workerId,
    delayTime: job.delayTime,
    executionTime: job.executionTime,
    logs: job.status === "IN_PROGRESS" && job.workerId ? await readWorkerLogs(job.workerId) : [],
  };
  if (job.status !== "COMPLETED") {
    return res.json({ status: job.status, error: job.error, ...info });
  }
  const output = job.output ?? {};
  if (!output.glb_url) {
    return res.json({ status: "FAILED", error: "job finished without a mesh", ...info });
  }
  res.json({ status: job.status, modelUrl: output.glb_url, resolution: output.resolution, ...info });
});


app.get("/api/generations/:id/model.glb", async (req, res) => {
  const file = await s3.send(new GetObjectCommand({ Bucket: s3Config.bucketName, Key: `${req.params.id}.glb` }));
  res.type("model/gltf-binary");
  Readable.fromWeb(file.Body!.transformToWebStream() as WebReadableStream).pipe(res);
});

// Page routes from client/src: serve the page so a direct link works.
app.get(["/models/:id", "/images/:id"], (_req, res) => res.sendFile(`${CLIENT_DIST}/index.html`));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT} -> Runpod endpoint ${ENDPOINT_ID}`));

const API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID;
const JOBS_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;
const MANAGE_URL = `https://api.runpod.io/v2/serverless/${ENDPOINT_ID}`; // worker logs exist only here

type JobOutput = { glb_url?: string; resolution?: number };
type RunpodJob = {
  id: string;
  status: string;
  output?: JobOutput;
  error?: string;
  workerId?: string;
  delayTime?: number;
  executionTime?: number;
};

async function fetchJobsApi(path: string, body?: unknown): Promise<Response> {
  const res = await fetch(JOBS_URL + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Runpod ${res.status}: ${await res.text()}`);
  }
  return res;
}

export async function callRunpod(path: string, body?: unknown): Promise<RunpodJob> {
  return (await fetchJobsApi(path, body)).json() as Promise<RunpodJob>;
}

type EndpointHealth = { jobs: Record<string, number>; workers: Record<string, number> };

export async function getHealth(): Promise<EndpointHealth> {
  return (await fetchJobsApi("/health")).json() as Promise<EndpointHealth>;
}

const LOG_READ_MS = 1500;
const LOG_LINES = 40;

export async function readWorkerLogs(workerId: string): Promise<string[]> {
  const url = `${MANAGE_URL}/workers/${workerId}/logs?tail=${LOG_LINES}`;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LOG_READ_MS);
  const lines: string[] = [];
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` }, signal: abort.signal });
    if (!res.ok || !res.body) {
      return [`(no logs: Runpod ${res.status})`];
    }
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop()!;
      for (const part of parts) {
        if (part.startsWith("data:{")) {
          lines.push((JSON.parse(part.slice("data:".length)) as { line: string }).line);
        }
      }
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }
  return lines.slice(-LOG_LINES);
}

export async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error || res.statusText)
  }
  return body as T
}

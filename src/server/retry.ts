export class HttpError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldRetry(error: unknown) {
  if (!(error instanceof HttpError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
  retries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1 || !shouldRetry(error)) break;
      await delay(300 * 2 ** attempt + Math.floor(Math.random() * 120));
    }
  }

  if (lastError instanceof Error) {
    lastError.message = `${label}: ${lastError.message}`;
  }
  throw lastError;
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit,
  label: string
): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, init);
    const text = await response.text();
    if (!response.ok) {
      throw new HttpError(`${response.status} ${response.statusText}`, response.status, text);
    }
    return text ? (JSON.parse(text) as T) : ({} as T);
  }, label);
}

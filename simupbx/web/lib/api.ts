'use client';

// Bridge to the local SimuPBX API. Every helper degrades silently so the UI
// stays fully usable in pure-demo mode (no API running).

export const API_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000';

export async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface RealtimeEvent {
  event: string;
  data: Record<string, unknown> & { callId?: number };
}

/** Subscribe to the API's realtime feed. Returns an unsubscribe function. */
export function openRealtime(onEvent: (ev: RealtimeEvent) => void): () => void {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    try {
      ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/realtime`);
      ws.onmessage = (msg) => {
        try {
          onEvent(JSON.parse(msg.data as string) as RealtimeEvent);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 4000);
      };
      ws.onerror = () => ws?.close();
    } catch {
      if (!closed) retry = setTimeout(connect, 4000);
    }
  };
  connect();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}

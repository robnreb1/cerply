// web/app/api/health/route.ts
import { NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

// Accept bypass token via header or query param so smoke tests work with Protection enabled
function getBypassToken(req: Request) {
  const url = new URL(req.url);
  return (
    req.headers.get("x-vercel-protection-bypass") ||
    url.searchParams.get("vercel-protection-bypass") ||
    ""
  );
}

export async function GET(req: Request) {
  const bypass = getBypassToken(req);
  const headers: Record<string, string> = {};
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;

  try {
    const resp = await fetch(`${API}/api/health`, { headers, cache: "no-store" });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: "proxy_error", message: String(err) },
      { status: 502 }
    );
  }
}
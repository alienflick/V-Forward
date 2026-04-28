export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "").trim();

export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Service unavailable", { status: 503 });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;
    if (!["GET", "POST", "HEAD", "OPTIONS"].includes(req.method)) {
      return new Response("Method not allowed", { status: 405 });
    }

    const headers = new Headers();

    for (const [key, value] of req.headers) {
      const lower = key.toLowerCase();
      if ([
        "host", "connection", "keep-alive", "proxy-authenticate",
        "proxy-authorization", "te", "trailer", "transfer-encoding",
        "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto",
        "x-forwarded-port", "x-vercel-", "x-real-ip"
      ].includes(lower)) {
        continue;
      }
      headers.set(key, value);
    }

    const clientIp = req.headers.get("x-real-ip") || 
                     req.headers.get("x-forwarded-for");
    if (clientIp) {
      headers.set("x-forwarded-for", clientIp.split(",")[0].trim());
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      duplex: hasBody ? "half" : undefined,   // only add when needed
      redirect: "manual",
    });

    return response;

  } catch (err) {
    console.error("Relay error:", err?.message || err);
    return new Response("Service temporarily unavailable", { status: 502 });
  }
}

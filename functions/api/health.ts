/** GET /api/health : confirms the Cloudflare Pages Functions (Workers) backend is deployed. */
export const onRequestGet = () =>
  new Response(JSON.stringify({ ok: true, service: "mahboobah-stitches", phase: 1 }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// main.ts — Deno Deploy (sirve assets embebidos en el bundle)
import { contentType } from "jsr:@std/media-types";

function guessType(path: string) {
  const ct = contentType(path.split(".").pop() || "");
  return ct ?? "application/octet-stream";
}

async function serveAsset(pathname: string): Promise<Response> {
  const routes: Record<string, string> = {
    "/": "./personal1.html",
    "/personal1.html": "./personal1.html",
    "/personal2.html": "./personal2.html",
    "/travel_3.html": "./travel_3.html",      // ← NUEVA PÁGINA
    "/finalizar.html": "./finalizar.html",
    "/storage.js": "./storage.js",
    "/personal1.js": "./personal1.js",
  };

  const asset = routes[pathname] ?? ("." + pathname);
  if (asset.includes("..")) return new Response("Not Found", { status: 404 });

  try {
    const url = new URL(asset, import.meta.url);
    const res = await fetch(url);
    if (!res.ok) return new Response("Not Found", { status: 404 });
    const headers = new Headers(res.headers);
    headers.set("content-type", guessType(asset));
    return new Response(res.body, { status: 200, headers });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

Deno.serve((req) => {
  const { pathname } = new URL(req.url);
  return serveAsset(pathname);
});

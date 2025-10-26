// main.ts
import { serveDir } from "jsr:@std/http/file-server";

Deno.serve((req) => {
  // Sirve todo el repo; raíz -> personal1.html como "index"
  return serveDir(req, { fsRoot: ".", index: "personal1.html", quiet: true });
});

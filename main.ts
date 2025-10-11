// main.ts — sirve tu index.html y archivos estáticos
import { serveDir } from "https://deno.land/std@0.173.0/http/file_server.ts";

Deno.serve((req) =>
  serveDir(req, {
    fsRoot: ".",
    defaultDocument: "index.html",
    showDirListing: false,
    quiet: true,
  })
);

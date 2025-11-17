// deno run -A tu_script.ts
type SaveFormPayload = { clientId: string; formId: string; payload: unknown };
type UploadImagePayload = {
  clientId: string; formId: string;
  fileName: string; mimeType?: string; dataBase64: string; sourceId?: string;
};
type ClonePayload = { clientId: string; sourceFormId: string; newFormId: string; duplicateImages?: boolean };

async function hmacHex(secret: string, payload: unknown) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const data = enc.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const b = new Uint8Array(sig);
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

async function callWebApp<T>(url: string, secret: string, action: string, payload: unknown): Promise<T> {
  const signature = await hmacHex(secret, payload);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload, signature })
  });
  if (!res.ok) throw new Error(`WebApp error ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Unknown error");
  return json as T;
}

export async function saveFormToDrive(url: string, secret: string, p: SaveFormPayload) {
  return callWebApp<{ ok: true; fileId: string; url: string }>(url, secret, "saveForm", p);
}

export async function uploadImageToDrive(url: string, secret: string, p: UploadImagePayload) {
  return callWebApp<{ ok: true; fileId: string; url: string }>(url, secret, "uploadImage", p);
}

export async function cloneFormInDrive(url: string, secret: string, p: ClonePayload) {
  return callWebApp<{ ok: true; formJsonId: string; images: {fileId:string}[]; duplicateImages: boolean }>(
    url, secret, "cloneForm", p
  );
}

// Helpers
export async function fileToBase64(path: string) {
  const data = await Deno.readFile(path);
  return btoa(String.fromCharCode(...data));
}

/* ====== USO (ejemplo) ======
const WEBAPP_URL = "https://script.google.com/macros/s/AK.../exec";
const SECRET = "EL_MISMO_SECRETO_DEL_SCRIPT";

await saveFormToDrive(WEBAPP_URL, SECRET, {
  clientId: "c_123", formId: "f_2025_001", payload: { step1: {...}, step2: {...} }
});

const b64 = await fileToBase64("./foto_pasaporte.jpg");
await uploadImageToDrive(WEBAPP_URL, SECRET, {
  clientId: "c_123", formId: "f_2025_001",
  fileName: "2025-10-27_1_passport.jpg", mimeType: "image/jpeg", dataBase64: b64
});

await cloneFormInDrive(WEBAPP_URL, SECRET, {
  clientId: "c_123", sourceFormId: "f_2025_001", newFormId: "f_2025_001_clone", duplicateImages: false
});
================================ */
import { getStore } from "@netlify/blobs";
import { timingSafeEqual, createHash } from "node:crypto";

export const config = { path: ["/api/contenu", "/api/save"] };

const KEYS = ["contact","marque","boutonRendezVous","menu","accueil","dispositif","raisons","rendezVous","infosPratiques","ressources","questions","porteur","urgence","final","basDePage"];
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const h = (x) => createHash("sha256").update(String(x)).digest();

export default async (req) => {
  const store = getStore("capsule");
  const url = new URL(req.url);
  if (url.pathname === "/api/contenu") {
    const c = await store.get("contenu", { type: "json" });
    return c ? J(c) : J({ vide: true }, 404);
  }
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }
  const pw = process.env.EDIT_PASSWORD;
  if (!pw || !timingSafeEqual(h(b.password), h(pw))) return J({ error: "Mot de passe incorrect" }, 401);
  if (b.action === "verify") return J({ ok: true });
  if (b.action !== "save") return J({ error: "Action inconnue" }, 400);
  const c = b.content;
  if (!c || typeof c !== "object" || Array.isArray(c)) return J({ error: "Contenu invalide" }, 400);
  const raw = JSON.stringify(c);
  if (raw.length > 200000) return J({ error: "Contenu trop volumineux" }, 413);
  if (Object.keys(c).some((k) => !KEYS.includes(k))) return J({ error: "Clé inconnue" }, 400);
  await store.set("contenu", raw);
  return J({ ok: true });
};

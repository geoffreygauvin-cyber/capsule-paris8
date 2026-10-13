import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export const config = { path: "/api/gestion" };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const h = (x) => createHash("sha256").update(String(x)).digest();
const STATUTS = ["nouvelle", "a_recontacter", "contactee", "rdv_fixe", "en_cours", "terminee", "sans_suite"];

// GESTION_COMPTES = "violette:code1,equipe:code2"
function comptes() {
  return Object.fromEntries((process.env.GESTION_COMPTES || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => { const i = s.indexOf(":"); return [s.slice(0, i).trim().toLowerCase(), s.slice(i + 1)]; }));
}
const secret = () => process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "";
const sign = (p) => createHmac("sha256", secret()).update(p).digest("base64url");
function makeToken(user) { const p = Buffer.from(JSON.stringify({ u: user, e: Date.now() + 8 * 3600 * 1000 })).toString("base64url"); return p + "." + sign(p); }
function checkToken(t) {
  if (!secret() || typeof t !== "string") return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return o.e > Date.now() ? o.u : null; } catch { return null; }
}
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }

  if (b.action === "login") {
    const c = comptes(); const u = String(b.compte || "").trim().toLowerCase();
    await new Promise((r) => setTimeout(r, 600)); // freine les essais répétés
    if (!u || !(u in c) || !timingSafeEqual(h(b.code), h(c[u]))) return J({ error: "Compte ou code incorrect." }, 401);
    return J({ ok: true, token: makeToken(u), compte: u });
  }

  const user = checkToken(b.token);
  if (!user) return J({ error: "Session expirée, reconnectez-vous." }, 401);
  const store = getStore("demandes");

  if (b.action === "list") {
    const { blobs } = await store.list({ prefix: "d/" });
    const items = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    items.sort((a, z) => z.creeLe.localeCompare(a.creeLe));
    return J({ ok: true, items, compte: user, equipe: Object.keys(comptes()) });
  }

  const key = async (id) => { const { blobs } = await store.list({ prefix: "d/" }); const k = blobs.find((x) => x.key.endsWith("_" + id)); return k && k.key; };

  if (b.action === "update") {
    const k = await key(String(b.id)); if (!k) return J({ error: "Demande introuvable." }, 404);
    const r = await store.get(k, { type: "json" }); const p = b.patch || {};
    if ("statut" in p && STATUTS.includes(p.statut)) r.statut = p.statut;
    if ("assigne" in p) r.assigne = clean(p.assigne, 40);
    if ("rdv" in p) r.rdv = clean(p.rdv, 40);
    if ("notes" in p) r.notes = clean(p.notes, 1000);
    r.maj = new Date().toISOString(); r.majPar = user;
    await store.setJSON(k, r);
    return J({ ok: true, item: r });
  }
  if (b.action === "delete") {
    const k = await key(String(b.id)); if (!k) return J({ error: "Demande introuvable." }, 404);
    await store.delete(k); return J({ ok: true });
  }
  return J({ error: "Action inconnue" }, 400);
};

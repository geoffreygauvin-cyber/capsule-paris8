import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, createHash, scryptSync, randomBytes } from "node:crypto";

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
function makeToken(user, role, k) { const p = Buffer.from(JSON.stringify({ u: user, r: role, k, e: Date.now() + 8 * 3600 * 1000 })).toString("base64url"); return p + "." + sign(p); }
const bind = (x) => h(x).toString("hex").slice(0, 10);
const hashCode = (code, salt) => scryptSync(String(code), salt, 32).toString("hex");
const NAME = /^[a-z0-9._-]{2,30}$/;
const WORDS = ["lune","pivot","cedre","brume","sable","tilleul","ardoise","rivage","opale","jonc","orage","figuier","galet","prune","aube","lilas","bruyere","falaise"];
function genCode() { const b = randomBytes(8); return [0,1,2].map((i) => WORDS[b[i] % WORDS.length]).join("-") + (10 + (b[3] % 90)); }
function checkToken(t) {
  if (!secret() || typeof t !== "string") return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return o.e > Date.now() ? o : null; } catch { return null; }
}
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").slice(0, n);

export default async (req) => {
  const ac = getStore("comptes");
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }

  if (b.action === "login") {
    const c = comptes(); const u = String(b.compte || "").trim().toLowerCase();
    await new Promise((r) => setTimeout(r, 600)); // freine les essais répétés
    if (u in c) {
      if (!timingSafeEqual(h(b.code), h(c[u]))) return J({ error: "Compte ou code incorrect." }, 401);
      return J({ ok: true, token: makeToken(u, "admin", bind(c[u])), compte: u });
    }
    const a = NAME.test(u) ? await ac.get(u, { type: "json" }) : null;
    if (!a || !timingSafeEqual(Buffer.from(hashCode(b.code, a.salt)), Buffer.from(a.hash))) return J({ error: "Compte ou code incorrect." }, 401);
    return J({ ok: true, token: makeToken(u, "membre", a.hash.slice(0, 10)), compte: u });
  }

  const tk = checkToken(b.token);
  if (!tk) return J({ error: "Session expirée, reconnectez-vous." }, 401);
  const user = tk.u, admin = tk.r === "admin";
  if (admin ? !(user in comptes()) || bind(comptes()[user]) !== tk.k : !((await ac.get(user, { type: "json" }))?.hash || "").startsWith(tk.k || "!"))
    return J({ error: "Session expirée, reconnectez-vous." }, 401);
  const store = getStore("demandes");

  if (b.action === "comptes_list" || b.action === "compte_create" || b.action === "compte_reset" || b.action === "compte_delete") {
    if (!admin) return J({ error: "Réservé aux comptes principaux." }, 403);
    const c = comptes(); const n = String(b.nom || "").trim().toLowerCase();
    if (b.action !== "comptes_list") {
      if (!NAME.test(n) || n in c) return J({ error: "Nom invalide (2 à 30 caractères : lettres, chiffres, . _ -) ou déjà réservé." }, 400);
      if (b.action === "compte_create" && await ac.get(n, { type: "json" })) return J({ error: "Ce compte existe déjà." }, 400);
      if (b.action !== "compte_create" && !(await ac.get(n, { type: "json" }))) return J({ error: "Compte introuvable." }, 404);
      if (b.action === "compte_delete") { await ac.delete(n); }
      else {
        const code = String(b.code || "").trim() || genCode();
        if (code.length < 8) return J({ error: "Code trop court (8 caractères minimum)." }, 400);
        const salt = randomBytes(16).toString("hex");
        const old = await ac.get(n, { type: "json" });
        await ac.setJSON(n, { nom: n, salt, hash: hashCode(code, salt), creeLe: old?.creeLe || new Date().toISOString(), creePar: old?.creePar || user });
        const { blobs } = await ac.list();
        return J({ ok: true, code, membres: await Promise.all(blobs.map(async (x) => { const v = await ac.get(x.key, { type: "json" }); return { nom: v.nom, creeLe: v.creeLe, creePar: v.creePar }; })), principaux: Object.keys(c) });
      }
    }
    const { blobs } = await ac.list();
    const membres = (await Promise.all(blobs.map((x) => ac.get(x.key, { type: "json" })))).filter(Boolean).map((v) => ({ nom: v.nom, creeLe: v.creeLe, creePar: v.creePar }));
    return J({ ok: true, membres, principaux: Object.keys(c) });
  }

  if (b.action === "list") {
    const { blobs } = await store.list({ prefix: "d/" });
    const items = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
    items.sort((a, z) => z.creeLe.localeCompare(a.creeLe));
    const { blobs: cb } = await ac.list();
    return J({ ok: true, items, compte: user, admin, equipe: [...Object.keys(comptes()), ...cb.map((x) => x.key)] });
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

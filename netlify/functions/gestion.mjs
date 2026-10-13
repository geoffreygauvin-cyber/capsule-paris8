import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, createHash, scryptSync, randomBytes } from "node:crypto";

import { SALLES, HEURES, JOURS, LIEU, weekday, cap, parisToUTC, chargerTout } from "../lib/rdv.mjs";
import { texte, chargerModeles, DEFAUTS, VARIABLES, variables, rendre, manquants } from "../lib/modeles.mjs";
import { envoyer, mailReady } from "../lib/mail.mjs";
import { randomUUID } from "node:crypto";

export const config = { path: "/api/gestion" };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const h = (x) => createHash("sha256").update(String(x)).digest();
const CATS = ["Documents", "Modèles", "Protocoles", "Formation", "Liens utiles"];
const MIMES = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword", odt: "application/vnd.oasis.opendocument.text", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", txt: "text/plain" };
const MAX_FICHIER = 4 * 1024 * 1024;
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

const mesures = (b) => {
  const o = {}; const n = (v) => (v === null || v === "" || v === undefined ? null : Number(v));
  const be = n(b.bienEtre), sa = n(b.satisfaction);
  if (be !== null && Number.isInteger(be) && be >= 0 && be <= 10) o.bienEtre = be;
  if (sa !== null && Number.isInteger(sa) && sa >= 0 && sa <= 10) o.satisfaction = sa;
  return o;
};
export default async (req) => {
  const ac = getStore("comptes");
  if (req.method === "GET") return J({ comptesPrincipaux: Object.keys(comptes()).length, secret: !!process.env.SESSION_SECRET });
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }

  if (b.action === "login") {
    const c = comptes(); const u = String(b.compte || "").trim().toLowerCase();
    await new Promise((r) => setTimeout(r, 600)); // freine les essais répétés
    if (u in c) {
      if (!timingSafeEqual(h(String(b.code ?? "").trim()), h(c[u].trim()))) return J({ error: "Compte ou code incorrect." }, 401);
      return J({ ok: true, token: makeToken(u, "admin", bind(c[u])), compte: u });
    }
    const a = NAME.test(u) ? await ac.get(u, { type: "json" }) : null;
    if (!a || !timingSafeEqual(Buffer.from(hashCode(String(b.code ?? "").trim(), a.salt)), Buffer.from(a.hash))) return J({ error: "Compte ou code incorrect." }, 401);
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
      if (b.action === "compte_delete") { await ac.delete(n); await getStore("profils").delete(n); }
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
    const rs = getStore("ressources"); const { blobs: rb } = await rs.list({ prefix: "m/" });
    const ressources = (await Promise.all(rb.map((x) => rs.get(x.key, { type: "json" })))).filter(Boolean).sort((a, z) => z.le.localeCompare(a.le));
    const ps = getStore("profils"); const { blobs: pb } = await ps.list();
    const photos = Object.fromEntries((await Promise.all(pb.map(async (x) => [x.key, (await ps.get(x.key, { type: "json" }))?.photo || ""]))).filter((x) => x[1]));
    return J({ ok: true, items, compte: user, admin, photos, ressources, equipe: [...Object.keys(comptes()), ...cb.map((x) => x.key)], cfg: { categories: CATS, seancesMax: 8, salles: SALLES, heures: HEURES, jours: JOURS, lieu: LIEU, mail: mailReady(), calUrl: process.env.CAL_TOKEN ? "/api/calendrier.ics?k=" + process.env.CAL_TOKEN : "" } });
  }

  const key = async (id) => { const { blobs } = await store.list({ prefix: "d/" }); const k = blobs.find((x) => x.key.endsWith("_" + id)); return k && k.key; };


  const noms = async () => { const { blobs } = await ac.list(); return [...Object.keys(comptes()), ...blobs.map((x) => x.key)]; };
  const mailMsg = async (fn) => { if (!mailReady()) return "non_configure"; try { await fn(); return "envoye"; } catch (e) { console.error(e); return "echec"; } };

  if (b.action === "planifier") {
    const all = await chargerTout(store);
    const cur = all.find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Demande introuvable." }, 404);
    const date = String(b.date || ""), heure = String(b.heure || ""), salle = String(b.salle || ""), th = String(b.therapeute || "").toLowerCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !JOURS.includes(weekday(date))) return J({ error: "Les rendez-vous ont lieu du lundi au mercredi." }, 400);
    if (!HEURES.includes(heure) || !SALLES.includes(salle)) return J({ error: "Créneau ou salle invalide." }, 400);
    if (!(await noms()).includes(th)) return J({ error: "Thérapeute inconnu·e." }, 400);
    if (parisToUTC(date, heure) < Date.now()) return J({ error: "Ce créneau est déjà passé." }, 400);
    const autre = all.filter((x) => x.rec.id !== cur.rec.id && x.rec.rdvDate === date && x.rec.rdvHeure === heure && x.rec.statut === "rdv_fixe");
    if (autre.some((x) => x.rec.salle === salle)) return J({ error: salle + " est déjà occupée à cette heure." }, 409);
    if (autre.some((x) => x.rec.therapeute === th)) return J({ error: cap(th) + " a déjà un rendez-vous à cette heure." }, 409);
    const r = cur.rec, modif = !!(r.uid && r.rdvDate && r.statut === "rdv_fixe");
    const had = !!r.uid; r.uid = r.uid || randomUUID(); r.seq = had ? (r.seq || 0) + 1 : 0;
    Object.assign(r, { rdvDate: date, rdvHeure: heure, salle, therapeute: th, assigne: th, statut: "rdv_fixe", rappelEnvoye: false, maj: new Date().toISOString(), majPar: user });
    let mail = "non_envoye";
    if (b.envoyer) mail = await mailMsg(async () => envoyer(r, await texte(modif ? "modification" : "invitation", r), "REQUEST", { modele: modif ? "modification" : "invitation", par: user, type: "auto" }));
    r.invitEnvoyee = mail === "envoye";
    await store.setJSON(cur.key, r);
    return J({ ok: true, item: r, mail });
  }
  if (b.action === "annuler_rdv" || b.action === "renvoyer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur || !cur.rec.rdvDate) return J({ error: "Rendez-vous introuvable." }, 404);
    const r = cur.rec; let mail = "non_envoye";
    if (b.action === "renvoyer") { mail = await mailMsg(async () => envoyer(r, await texte("invitation", r), "REQUEST", { modele: "invitation", par: user, type: "auto" })); if (mail === "envoye") r.invitEnvoyee = true; }
    else {
      r.seq = (r.seq || 0) + 1;
      if (b.envoyer && r.invitEnvoyee) mail = await mailMsg(async () => envoyer(r, await texte("annulation", r), "CANCEL", { modele: "annulation", par: user, type: "auto" }));
      Object.assign(r, { rdvDate: "", rdvHeure: "", salle: "", therapeute: "", statut: "a_recontacter", invitEnvoyee: false, rappelEnvoye: false });
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r, mail });
  }

  if (b.action === "profil_photo") {
    const ps = getStore("profils"), ph = String(b.photo || "");
    if (!ph) { await ps.delete(user); return J({ ok: true, photo: "" }); }
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(ph) || ph.length > 70000) return J({ error: "Image invalide ou trop lourde." }, 400);
    await ps.setJSON(user, { photo: ph }); return J({ ok: true, photo: ph });
  }
  if (b.action === "creer") {
    const prenom = clean(b.prenom, 60).trim(), email = clean(b.email, 120).trim().toLowerCase(), tel = clean(b.tel, 25).trim();
    if (!prenom) return J({ error: "Indiquez un prénom." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ error: "Adresse mail invalide." }, 400);
    const id = randomUUID(), now = new Date().toISOString();
    const rec = { id, creeLe: now, prenom, email, tel, creneaux: [], message: "", statut: "a_recontacter", assigne: "", notes: "", source: "manuel", seances: [], maj: now, majPar: user };
    await store.setJSON("d/" + now + "_" + id, rec); return J({ ok: true, item: rec });
  }
  if (b.action === "seance_issue" || b.action === "seance_supprimer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Introuvable." }, 404);
    const r = cur.rec; r.seances = r.seances || [];
    if (b.action === "seance_issue") {
      if (!r.rdvDate || r.statut !== "rdv_fixe") return J({ error: "Pas de rendez-vous en cours." }, 400);
      if (!["realisee", "absence"].includes(b.issue)) return J({ error: "Issue invalide." }, 400);
      if (parisToUTC(r.rdvDate, r.rdvHeure) > Date.now()) return J({ error: "Ce rendez-vous n'a pas encore eu lieu." }, 400);
      const sc = { date: r.rdvDate, heure: r.rdvHeure, salle: r.salle, therapeute: r.therapeute, issue: b.issue, par: user, le: new Date().toISOString() };
      if (b.issue === "realisee") Object.assign(sc, mesures(b)); r.seances.push(sc);
      r.seq = (r.seq || 0) + 1;
      Object.assign(r, { rdvDate: "", rdvHeure: "", salle: "", invitEnvoyee: false, rappelEnvoye: false, statut: b.issue === "realisee" ? "en_cours" : "a_recontacter" });
    } else {
      const i = Number(b.index); if (!Number.isInteger(i) || !r.seances[i]) return J({ error: "Séance introuvable." }, 404);
      r.seances.splice(i, 1);
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r });
  }

  if (b.action === "seance_mesure" || b.action === "changement") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Introuvable." }, 404);
    const r = cur.rec; r.seances = r.seances || [];
    if (b.action === "seance_mesure") {
      const i = Number(b.index); const sc = r.seances[i];
      if (!Number.isInteger(i) || !sc || sc.issue !== "realisee") return J({ error: "Séance introuvable." }, 404);
      delete sc.bienEtre; delete sc.satisfaction; Object.assign(sc, mesures(b)); sc.mesurePar = user;
    } else {
      if (!r.seances.some((x) => x.issue === "realisee")) return J({ error: "Aucune séance réalisée." }, 400);
      const v = b.valeur === null || b.valeur === "" || b.valeur === undefined ? null : Number(b.valeur);
      if (v === null) delete r.changement; else if (Number.isInteger(v) && v >= 1 && v <= 7) r.changement = { v, le: new Date().toISOString(), par: user }; else return J({ error: "Valeur invalide." }, 400);
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r });
  }

  if (b.action === "res_get") {
    const rs = getStore("ressources"), m = await rs.get("m/" + String(b.id), { type: "json" });
    if (!m || m.type !== "fichier") return J({ error: "Fichier introuvable." }, 404);
    const buf = await rs.get("f/" + m.id, { type: "arrayBuffer" }); if (!buf) return J({ error: "Fichier introuvable." }, 404);
    return J({ ok: true, nom: m.nom, mime: m.mime, data: Buffer.from(buf).toString("base64") });
  }
  if (["res_add", "res_upd", "res_del"].includes(b.action)) {
    if (!admin) return J({ error: "Réservé aux comptes principaux." }, 403);
    const rs = getStore("ressources");
    if (b.action === "res_del") { const id = String(b.id); await rs.delete("m/" + id); await rs.delete("f/" + id); return J({ ok: true }); }
    const titre = clean(b.titre, 120).trim(), description = clean(b.description, 500).trim(), categorie = CATS.includes(b.categorie) ? b.categorie : CATS[0];
    if (!titre) return J({ error: "Donnez un titre." }, 400);
    if (b.action === "res_upd") {
      const m = await rs.get("m/" + String(b.id), { type: "json" }); if (!m) return J({ error: "Introuvable." }, 404);
      Object.assign(m, { titre, description, categorie }); await rs.setJSON("m/" + m.id, m); return J({ ok: true, item: m });
    }
    const id = randomUUID(), now = new Date().toISOString(); let m;
    if (b.lien) {
      if (!/^https?:\/\/[^\s]+$/i.test(String(b.lien))) return J({ error: "Le lien doit commencer par http:// ou https://." }, 400);
      m = { id, type: "lien", titre, description, categorie, url: String(b.lien).slice(0, 500), par: user, le: now };
    } else {
      const nom = clean(b.nom, 150).replace(/[\\/]/g, "_"), ext = nom.split(".").pop().toLowerCase();
      if (!MIMES[ext]) return J({ error: "Format non accepté (PDF, Word, Excel, PowerPoint, image, texte)." }, 400);
      if (typeof b.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(b.data)) return J({ error: "Fichier invalide." }, 400);
      const buf = Buffer.from(b.data, "base64"); if (!buf.length || buf.length > MAX_FICHIER) return J({ error: "Fichier trop lourd (4 Mo maximum). Pour un fichier plus gros, ajoutez un lien." }, 413);
      await rs.set("f/" + id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      m = { id, type: "fichier", titre, description, categorie, nom, mime: MIMES[ext], taille: buf.length, par: user, le: now };
    }
    await rs.setJSON("m/" + id, m); return J({ ok: true, item: m });
  }

  if (b.action === "messages_data") {
    const ms = getStore("messages"); const { blobs } = await ms.list({ prefix: "l/" });
    let journal = (await Promise.all(blobs.sort((x, y) => y.key.localeCompare(x.key)).slice(0, 200).map((x) => ms.get(x.key, { type: "json" })))).filter(Boolean);
    if (!admin) journal = journal.filter((j) => j.par === user);
    return J({ ok: true, modeles: Object.values(await chargerModeles()), variables: VARIABLES, journal, mail: mailReady() });
  }
  if (b.action === "modele_save" || b.action === "modele_reset") {
    if (!admin) return J({ error: "Réservé aux comptes principaux." }, 403);
    const id = String(b.id); if (!DEFAUTS[id]) return J({ error: "Modèle inconnu." }, 404);
    const st = getStore("modeles");
    if (b.action === "modele_reset") await st.delete(id);
    else { const objet = clean(b.objet, 200).trim(), corps = clean(b.corps, 4000).trim(); if (id !== "libre" && (!objet || !corps)) return J({ error: "L'objet et le texte ne peuvent pas être vides." }, 400); await st.setJSON(id, { objet, corps }); }
    return J({ ok: true, modeles: Object.values(await chargerModeles()) });
  }
  if (b.action === "message_apercu" || b.action === "message_envoyer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Personne introuvable." }, 404);
    const r = cur.rec, m = (await chargerModeles())[String(b.modele)]; if (!m) return J({ error: "Modèle inconnu." }, 404);
    const v = variables(r);
    if (b.action === "message_apercu") return J({ ok: true, objet: rendre(m.objet, v), corps: rendre(m.corps, v), manquants: [...new Set([...manquants(m.objet, v), ...manquants(m.corps, v)])], email: r.email });
    const objet = clean(b.objet, 200).trim(), corps = clean(b.corps, 4000).trim();
    if (!objet || !corps) return J({ error: "L'objet et le message sont obligatoires." }, 400);
    const mail = await mailMsg(async () => envoyer(r, { subject: objet, text: corps }, null, { modele: m.id, par: user, type: "manuel" }));
    if (mail === "envoye") { r.maj = new Date().toISOString(); r.majPar = user; if (r.statut === "nouvelle") r.statut = "contactee"; await store.setJSON(cur.key, r); }
    return J({ ok: mail === "envoye", mail, item: r, error: mail === "envoye" ? undefined : mail === "non_configure" ? "L'envoi de mails n'est pas encore configuré." : "Le mail n'a pas pu partir." });
  }

  if (b.action === "update") {
    const k = await key(String(b.id)); if (!k) return J({ error: "Demande introuvable." }, 404);
    const r = await store.get(k, { type: "json" }); const p = b.patch || {};
    if ("statut" in p && STATUTS.includes(p.statut)) r.statut = p.statut;
    if ("assigne" in p) r.assigne = clean(p.assigne, 40);
    if ("notes" in p) r.notes = clean(p.notes, 1000);
    if ("prenom" in p && clean(p.prenom, 60).trim()) r.prenom = clean(p.prenom, 60).trim();
    if ("tel" in p) r.tel = clean(p.tel, 25).trim();
    if ("email" in p && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(p.email, 120).trim())) r.email = clean(p.email, 120).trim().toLowerCase();
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

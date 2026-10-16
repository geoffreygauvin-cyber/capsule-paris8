import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { norm, vue, parisToUTC, jourLong, heureFr, cap, LIEU, etiquette } from "../lib/rdv.mjs";
import { lireLien, siteUrl } from "../lib/lien.mjs";
import { texte } from "../lib/modeles.mjs";
import { envoyer, mailReady } from "../lib/mail.mjs";

// Page /rdv : la personne qui a reçu un rendez-vous peut l'annuler ou demander un autre créneau, sans compte.
// Le lien (signé) est dans le mail de confirmation, le rappel et l'invitation d'agenda. GET ne modifie jamais rien
// (les messageries ouvrent parfois les liens à l'avance) ; seule une action POST volontaire annule.
export const config = { path: "/api/rdv" };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").trim().slice(0, n);
const JOURS = ["Lundi", "Mardi", "Mercredi"];
const contact = () => process.env.MAIL_USER || "capsule-contact@gmail.com";

async function charger(t) {
  const l = lireLien(t); if (!l) return null;
  const st = getStore("demandes"), { blobs } = await st.list({ prefix: "d/" });
  const k = blobs.find((b) => b.key.endsWith("_" + l.pid)); if (!k) return null;
  const rec = norm(await st.get(k.key, { type: "json" })); if (!rec) return null;
  return { st, key: k.key, rec, x: rec.rdvs.find((y) => String(y.id) === l.rid) || null };
}
const etat = (c) => (!c ? "invalide" : !c.x ? "inactif" : parisToUTC(c.x.date, c.x.heure) <= Date.now() ? "passe" : "ok");

async function prevenirEquipe(rec, x, { type, tardif, creneaux, message }) {
  const dest = new Set([contact()]);
  try { const p = await getStore({ name: "profils", consistency: "strong" }).get(String(x.therapeute || ""), { type: "json" }); if (p?.email) dest.add(String(p.email).trim().toLowerCase()); } catch { /* adresse perso facultative */ }
  const quand = `${jourLong(x.date)} à ${heureFr(x.heure)}`, annule = type === "annuler";
  // Le message libre de la personne reste dans la plateforme : il peut contenir des éléments personnels.
  const text = [
    `${etiquette(rec)} (patient·e) a ${annule ? "annulé son rendez-vous" : "demandé à reporter son rendez-vous"} depuis le lien de son mail.`, "",
    `Rendez-vous : ${quand}, ${x.salle}, avec ${cap(x.therapeute)}`,
    ...(tardif ? ["Prévenu·e moins de 24 h avant : dernière minute."] : []),
    ...(!annule && creneaux.length ? [`Jours qui conviennent : ${creneaux.join(", ")}`] : []),
    ...(message ? ["Un message a été laissé : à lire dans la fiche, sur la plateforme."] : []),
    "", annule ? "Le créneau est libéré. La fiche passe dans « À recontacter » s'il n'y a pas d'autre rendez-vous." : "Le créneau est libéré. Pour replanifier : Demandes › À recontacter, puis « Planifier ».",
    `${siteUrl()}/gestion`,
  ].join("\n");
  const subject = `${tardif ? "Dernière minute · " : ""}${annule ? "Annulation" : "Demande de report"} : ${etiquette(rec)}, ${quand}`;
  for (const a of dest) {
    try { await envoyer({ email: a, prenom: "Équipe CAPSULE", id: "" }, { subject, text }, null, { modele: annule ? "Annulation par la personne (alerte équipe)" : "Report demandé (alerte équipe)", par: "système", type: "auto" }); }
    catch (e) { console.error("alerte équipe", e.message); }
  }
}

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const c = await charger(url.searchParams.get("t")), e = etat(c);
    if (e !== "ok") return J({ etat: e, contact: contact() }, e === "invalide" ? 404 : 200);
    const { rec, x } = c, h24 = parisToUTC(x.date, x.heure) - Date.now() < 24 * 3600e3;
    return J({ etat: "ok", prenom: rec.prenom, date: cap(jourLong(x.date)), heure: heureFr(x.heure), salle: x.salle, lieu: LIEU, therapeute: cap(x.therapeute), tardif: h24, jours: JOURS, contact: contact() });
  }
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b; try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }
  const type = b.action === "annuler" ? "annuler" : b.action === "reporter" ? "reporter" : null;
  if (!type) return J({ error: "Action inconnue" }, 400);

  const c = await charger(b.t), e = etat(c);
  if (e !== "ok") return J({ ok: false, etat: e, contact: contact() }, e === "invalide" ? 404 : 409);
  const { st, key, rec, x } = c;
  const message = clean(b.message, 400), creneaux = type === "reporter" ? (Array.isArray(b.creneaux) ? b.creneaux : []).filter((j) => JOURS.includes(j)) : [];
  const tardif = parisToUTC(x.date, x.heure) - Date.now() < 24 * 3600e3, now = new Date().toISOString();

  // 1) on libère le créneau et on garde une trace pour l'équipe ; 2) seulement ensuite, les mails (un échec de mail n'annule rien)
  x.seq = (x.seq || 0) + 1;
  const v = vue(rec, x), rdv = { date: x.date, heure: x.heure, salle: x.salle, therapeute: x.therapeute };
  rec.rdvs = rec.rdvs.filter((y) => y !== x);
  if (!rec.rdvs.length && rec.statut === "rdv_fixe") rec.statut = "a_recontacter";
  if (creneaux.length) rec.creneaux = creneaux;
  rec.retours = [...(rec.retours || []), { id: randomUUID().slice(0, 8), le: now, type, rdv, creneaux, message, tardif, vu: false }].slice(-20);
  rec.maj = now; rec.majPar = "la personne";
  await st.setJSON(key, rec);

  let mail = "non_configure";
  if (mailReady()) {
    mail = "envoye";
    try { await envoyer(v, await texte(type === "annuler" ? "annulation_patient" : "report_patient", v), "CANCEL", { modele: type === "annuler" ? "annulation_patient" : "report_patient", par: "la personne", type: "auto" }); }
    catch (err) { console.error("confirmation", err.message); mail = "echec"; }
    await prevenirEquipe(rec, x, { type, tardif, creneaux, message });
  }
  return J({ ok: true, type, mail, date: cap(jourLong(x.date)), heure: heureFr(x.heure), tardif });
};

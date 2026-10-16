// Agenda personnel : un flux .ics privé par compte (rendez-vous patient·es, réunions, supervisions, entretiens), à ajouter à Google Agenda, Outlook ou Apple Calendrier.
// - Le lien contient le nom du compte, un numéro de version et une signature HMAC (SESSION_SECRET). Le numéro de version est stocké (store « agenda », clé = nom du compte) :
//   « Changer mon lien » l'augmente, ce qui désactive l'ancien lien ; la suppression d'un compte fait de même.
// - Qui voit quoi : les mêmes événements que dans « Mon emploi du temps » (participant·e ou organisateur·rice). Un entretien privé n'affiche jamais son motif ni ses notes.
import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { chargerTout, parisToUTC, cap, LIEU, etiquette } from "./rdv.mjs";

const secret = () => process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "";
const sig = (u, v) => createHmac("sha256", "agenda|" + secret()).update(u + "|" + v).digest("base64url").slice(0, 24);
const st = () => getStore({ name: "agenda", consistency: "strong" });

export async function jeton(user, { renouveler = false } = {}) {
  let v = (await st().get(user, { type: "json" }))?.v || 0;
  if (!v || renouveler) { v += 1; await st().setJSON(user, { v, le: new Date().toISOString() }); }
  return Buffer.from(user, "utf8").toString("base64url") + "." + v + "." + sig(user, v);
}
export const lien = (origine, t) => `${String(origine).replace(/\/+$/, "")}/api/agenda.ics?t=${t}`;
export async function revoquer(user) { const v = (await st().get(user, { type: "json" }))?.v || 0; await st().setJSON(user, { v: v + 1, revoque: true, le: new Date().toISOString() }); }

export async function lire(t) {
  const [b, v, g, extra] = String(t || "").split(".");
  if (!b || !v || !g || extra !== undefined) return null;
  const user = Buffer.from(b, "base64url").toString("utf8");
  if (!/^[a-z0-9._-]{2,30}$/.test(user) || !/^\d{1,6}$/.test(v)) return null;
  const bon = sig(user, v);
  if (g.length !== bon.length || !timingSafeEqual(Buffer.from(g), Buffer.from(bon))) return null;
  return (await st().get(user, { type: "json" }))?.v === Number(v) ? user : null;
}
// Le compte existe-t-il encore (compte principal de l'environnement ou compte créé dans l'appli) et n'est-il pas désactivé ?
export async function existe(user) {
  const env = (process.env.GESTION_COMPTES || "").split(",").map((s) => s.split(":")[0].trim().toLowerCase()).filter(Boolean);
  if (env.includes(user)) return true;
  const a = await getStore("comptes").get(user, { type: "json" });
  return !!a && !(a.role === "superviseur" && !a.actif);
}

// --- fabrication du .ics ---
const esc = (s) => String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function fold(l) { // 75 octets maximum par ligne, sans couper un caractère accentué
  const b = Buffer.from(l, "utf8"); if (b.length <= 75) return l;
  const parts = []; let i = 0;
  while (i < b.length) { let j = Math.min(i + (i ? 74 : 75), b.length); while (j < b.length && (b[j] & 0xc0) === 0x80) j--; parts.push(b.subarray(i, j).toString("utf8")); i = j; }
  return parts.join("\r\n ");
}
function evt({ uid, debut, fin, titre, lieu, desc, url, modif }) {
  const L = ["BEGIN:VEVENT", `UID:${uid}@capsule-paris8`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(debut)}`, `DTEND:${stamp(fin)}`, `SUMMARY:${esc(titre)}`];
  if (modif) L.push(`LAST-MODIFIED:${stamp(modif)}`, `SEQUENCE:${Math.floor(modif / 1000)}`);
  if (lieu) L.push(`LOCATION:${esc(lieu)}`);
  if (desc) L.push(`DESCRIPTION:${esc(desc)}`);
  if (url) L.push(`URL:${url}`);
  L.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
  return L;
}
const liste = (a) => (a || []).map(cap).join(", ");

export async function ics(user) {
  const depuis = Date.now() - 90 * 864e5, E = [];
  for (const { rec } of await chargerTout(getStore("demandes"))) {
    for (const x of rec.rdvs || []) {
      if (x.therapeute !== user) continue;
      const d = parisToUTC(x.date, x.heure); if (d < depuis) continue;
      E.push(evt({ uid: x.uid || `rdv-${rec.id}-${x.id}`, debut: d, fin: d + 3600e3, titre: `Consultation · ${etiquette(rec)}`, lieu: `${x.salle}, ${LIEU}`, desc: `Rendez-vous patient·e : ${etiquette(rec)} (${x.salle}).` }));
    }
  }
  const ss = getStore("supervisions"), { blobs } = await ss.list();
  for (const b of blobs) {
    const x = await ss.get(b.key, { type: "json" }); if (!x || !x.date || !x.heure) continue;
    const part = (x.participants || []).includes(user), orga = x.superviseur === user; if (!part && !orga) continue;
    const d = parisToUTC(x.date, x.heure); if (d < depuis) continue;
    let titre, desc;
    if (x.type === "entretien") { titre = orga ? `Entretien · ${cap((x.participants || [])[0] || "")}` : "Entretien individuel"; desc = orga ? "" : `Avec ${cap(x.superviseur)}.`; }
    else if (x.type === "reunion") { titre = x.titre ? `Réunion · ${x.titre}` : "Réunion d’équipe"; desc = `Organisée par ${cap(x.superviseur)}.\nInvité·es : ${liste(x.participants)}.`; }
    else { titre = `Supervision ${x.type === "individuelle" ? "individuelle" : "de groupe"}${x.titre ? " · " + x.titre : ""}`; desc = `Avec ${cap(x.superviseur)}.\nParticipant·es : ${liste(x.participants)}.`; }
    if (x.lien) desc += (desc ? "\n" : "") + `Visio : ${x.lien}`;
    E.push(evt({ uid: x.id, debut: d, fin: d + (Number(x.duree) || 60) * 60e3, titre, lieu: x.lieu || "", desc, url: x.lien || "", modif: Date.parse(x.maj || x.creeLe || "") || 0 }));
  }
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CAPSULE Paris 8//Agenda//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:CAPSULE – mon agenda", "X-WR-TIMEZONE:Europe/Paris", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...E.flat(), "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}

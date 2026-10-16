// Règles du planning et outils partagés (rendez-vous, calendrier, e-mails)
import { lienRdv } from "./lien.mjs";
export const SALLES = ["Salle 1", "Salle 2", "Salle 3"];
export const HEURES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]; // créneaux d'1 h, fin à 17 h
export const JOURS = [1, 2, 3]; // lundi, mardi, mercredi
export const LIEU = "Université Paris 8, 2 rue de la Liberté, Saint-Denis (bâtiment C)";
const TZ = "Europe/Paris";

function parisParts(ms) {
  const o = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(ms).forEach((p) => (o[p.type] = p.value));
  return o;
}
export function parisToUTC(date, heure) {
  const [y, m, d] = date.split("-").map(Number); const [H, M] = heure.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, H, M); let t = target;
  for (let i = 0; i < 3; i++) { const p = parisParts(t); t += target - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute); }
  return t;
}
export function tomorrowParis() { const p = parisParts(Date.now() + 24 * 3600e3); return `${p.year}-${p.month}-${p.day}`; }
export const weekday = (date) => new Date(date + "T12:00:00Z").getUTCDay();
export const cap = (s) => String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);

// Pseudonymisation des patient·es : on n'affiche jamais le prénom en liste, seulement « M. · 42 » (initiale du prénom + numéro stable).
// Le numéro (rec.num) est attribué une fois pour toutes par chargerTout, dans l'ordre d'arrivée des demandes.
export const initiale = (prenom) => { const m = String(prenom || "").normalize("NFC").match(/\p{L}/u); return m ? m[0].toLocaleUpperCase("fr") : "?"; };
export const etiquette = (r) => `${initiale(r && r.prenom)}. · ${r && r.num != null ? r.num : "?"}`;

export function jourLong(date) { return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(date + "T12:00:00Z")); }
export function heureFr(h) { const [H, M] = h.split(":"); return `${+H} h${M === "00" ? "" : " " + M}`; }

const fold = (l) => (l.length <= 74 ? l : l.match(/.{1,73}/g).join("\r\n "));
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function vevent(r, { method, summary, forPatient }) {
  const start = parisToUTC(r.rdvDate, r.rdvHeure), end = start + 3600e3;
  const org = process.env.MAIL_USER || "capsule-contact@gmail.com";
  const lien = forPatient ? lienRdv(r.id, r.rdvId) : "";
  const desc = forPatient
    ? `Consultation CAPSULE avec ${cap(r.therapeute)} (étudiant·e de M2 en psychologie).\nLieu : ${LIEU}, ${r.salle}.\n` + (lien ? `Un empêchement ? Annulez ou demandez un autre créneau : ${lien}` : "En cas d'empêchement, répondez au mail d'invitation.")
    : `${etiquette(r)} · ${r.salle} · ${cap(r.therapeute)}`;
  const L = ["BEGIN:VEVENT", `UID:${r.uid}@capsule-paris8`, `SEQUENCE:${r.seq || 0}`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(summary)}`, `LOCATION:${esc(LIEU + ", " + r.salle)}`, `DESCRIPTION:${esc(desc)}`, `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`];
  if (lien && method !== "CANCEL") L.push(`URL:${lien}`);
  if (forPatient) {
    L.push(`ORGANIZER;CN=CAPSULE Paris 8:mailto:${org}`, `ATTENDEE;CN=${esc(r.prenom)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${r.email}`);
    if (method !== "CANCEL") L.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Rendez-vous CAPSULE demain", "END:VALARM");
  }
  L.push("END:VEVENT");
  return L;
}
const wrap = (method, ev) => ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CAPSULE Paris 8//FR", "CALSCALE:GREGORIAN", `METHOD:${method}`, ...ev, "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";

export const icsPatient = (r, method) => wrap(method, vevent(r, { method, summary: "Rendez-vous CAPSULE", forPatient: true }));
export function icsFeed(rdvs) {
  return wrap("PUBLISH", rdvs.flatMap((r) => vevent(r, { method: "PUBLISH", summary: `${etiquette(r)} · ${r.salle} · ${cap(r.therapeute)}`, forPatient: false })))
    .replace("CALSCALE:GREGORIAN", "CALSCALE:GREGORIAN\r\nX-WR-CALNAME:CAPSULE – rendez-vous");
}

// Une personne peut avoir plusieurs rendez-vous à venir : rec.rdvs = [{ id, uid, seq, date, heure, salle, therapeute, invitEnvoyee, rappelEnvoye }].
// Les anciennes fiches (un seul rendez-vous dans rdvDate, rdvHeure...) sont converties à la lecture.
export function norm(r) {
  if (!r) return r;
  if (!Array.isArray(r.rdvs)) {
    r.rdvs = r.rdvDate && r.statut === "rdv_fixe"
      ? [{ id: r.uid || "r0", uid: r.uid || "r0-" + r.id, seq: r.seq || 0, date: r.rdvDate, heure: r.rdvHeure, salle: r.salle, therapeute: r.therapeute, invitEnvoyee: !!r.invitEnvoyee, rappelEnvoye: !!r.rappelEnvoye }]
      : [];
  }
  for (const k of ["rdvDate", "rdvHeure", "salle", "invitEnvoyee", "rappelEnvoye", "uid", "seq"]) delete r[k];
  r.rdvs.sort((a, z) => (a.date + a.heure).localeCompare(z.date + z.heure));
  return r;
}
// Fiche + un rendez-vous précis, pour les mails, les invitations .ics et les modèles de texte
export const vue = (r, x) => (x ? { ...r, rdvId: x.id, rdvDate: x.date, rdvHeure: x.heure, salle: x.salle, therapeute: x.therapeute, uid: x.uid, seq: x.seq || 0 } : r);
export function lundi(date) { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }

export async function chargerTout(store) {
  const { blobs } = await store.list({ prefix: "d/" });
  const all = (await Promise.all(blobs.map(async (x) => { const rec = norm(await store.get(x.key, { type: "json" })); return rec && { key: x.key, rec }; }))).filter(Boolean);
  // Numéro stable des patient·es (rec.num) : les fiches sans numéro en reçoivent un, dans l'ordre d'arrivée, à la suite du plus grand déjà donné.
  const sans = all.filter((x) => !Number.isInteger(x.rec.num));
  if (sans.length) {
    let n = all.reduce((m, x) => (Number.isInteger(x.rec.num) ? Math.max(m, x.rec.num) : m), 0);
    sans.sort((a, z) => String(a.rec.creeLe).localeCompare(String(z.rec.creeLe)) || a.key.localeCompare(z.key));
    for (const x of sans) x.rec.num = ++n;
    for (let i = 0; i < sans.length; i += 12) await Promise.all(sans.slice(i, i + 12).map((x) => store.setJSON(x.key, x.rec)));
  }
  return all;
}

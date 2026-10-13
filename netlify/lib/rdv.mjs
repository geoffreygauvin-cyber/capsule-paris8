// Règles du planning et outils partagés (rendez-vous, calendrier, e-mails)
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

export function jourLong(date) { return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(date + "T12:00:00Z")); }
export function heureFr(h) { const [H, M] = h.split(":"); return `${+H} h${M === "00" ? "" : " " + M}`; }

const fold = (l) => (l.length <= 74 ? l : l.match(/.{1,73}/g).join("\r\n "));
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function vevent(r, { method, summary, forPatient }) {
  const start = parisToUTC(r.rdvDate, r.rdvHeure), end = start + 3600e3;
  const org = process.env.MAIL_USER || "capsule-contact@gmail.com";
  const desc = forPatient
    ? `Consultation CAPSULE avec ${cap(r.therapeute)} (étudiant·e de M2 en psychologie).\nLieu : ${LIEU}, ${r.salle}.\nEn cas d'empêchement, répondez au mail d'invitation.`
    : `${r.prenom} · ${r.salle} · ${cap(r.therapeute)}`;
  const L = ["BEGIN:VEVENT", `UID:${r.uid}@capsule-paris8`, `SEQUENCE:${r.seq || 0}`, `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(summary)}`, `LOCATION:${esc(LIEU + ", " + r.salle)}`, `DESCRIPTION:${esc(desc)}`, `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`];
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
  return wrap("PUBLISH", rdvs.flatMap((r) => vevent(r, { method: "PUBLISH", summary: `${r.prenom} · ${r.salle} · ${cap(r.therapeute)}`, forPatient: false })))
    .replace("CALSCALE:GREGORIAN", "CALSCALE:GREGORIAN\r\nX-WR-CALNAME:CAPSULE – rendez-vous");
}

const quand = (r) => `${jourLong(r.rdvDate)} à ${heureFr(r.rdvHeure)}`;
const pied = "\n\nSi vous avez un empêchement, répondez simplement à ce mail.\nL'équipe CAPSULE, Université Paris 8";
export function texteInvitation(r, modif) {
  return {
    subject: `${modif ? "Rendez-vous modifié" : "Votre rendez-vous"} CAPSULE, ${quand(r)}`,
    text: `Bonjour ${r.prenom},\n\n${modif ? "Votre rendez-vous a été déplacé." : "Votre rendez-vous est confirmé."}\n\nQuand : ${quand(r)} (durée : 1 h)\nOù : ${r.salle}, ${LIEU}\nAvec : ${cap(r.therapeute)}, étudiant·e de M2 en psychologie\n\nMétro ligne 13, station Saint-Denis–Université. Pas besoin d'apporter quoi que ce soit.\nL'invitation jointe s'ajoute à votre agenda, et nous vous enverrons un rappel la veille.${pied}`,
  };
}
export function texteRappel(r) {
  return { subject: `Rappel : rendez-vous CAPSULE demain à ${heureFr(r.rdvHeure)}`, text: `Bonjour ${r.prenom},\n\nPetit rappel : votre rendez-vous CAPSULE a lieu demain, ${quand(r)}.\nOù : ${r.salle}, ${LIEU}\nAvec : ${cap(r.therapeute)}${pied}` };
}
export function texteAnnulation(r) {
  return { subject: `Rendez-vous CAPSULE annulé, ${quand(r)}`, text: `Bonjour ${r.prenom},\n\nVotre rendez-vous du ${quand(r)} est annulé. Nous reviendrons vers vous pour en fixer un nouveau.${pied}` };
}

export async function chargerTout(store) {
  const { blobs } = await store.list({ prefix: "d/" });
  return (await Promise.all(blobs.map(async (x) => { const rec = await store.get(x.key, { type: "json" }); return rec && { key: x.key, rec }; }))).filter(Boolean);
}

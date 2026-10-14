import nodemailer from "nodemailer";
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { icsPatient } from "./rdv.mjs";

export const mailReady = () => !!(process.env.MAIL_USER && process.env.MAIL_PASS);
let tr;
function transport() {
  tr ??= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
  return tr;
}
async function journaliser(e) {
  try { const now = new Date().toISOString(); await getStore("messages").setJSON("l/" + now + "_" + randomUUID().slice(0, 8), { le: now, ...e }); } catch (err) { console.error("journal", err.message); }
}
// method : REQUEST (invitation / mise à jour), CANCEL (annulation), ou null (message simple)
// meta : { modele, par, type: "auto" | "manuel" } pour l'historique
export async function envoyer(r, { subject, text, html }, method, meta = {}) {
  const base = { a: r.email, nom: r.prenom, patientId: r.id || "", objet: subject, modele: meta.modele || "", par: meta.par || "", type: meta.type || "auto" };
  if (!mailReady()) { await journaliser({ ...base, statut: "echec", erreur: "Envoi de mail non configuré" }); throw new Error("Envoi de mail non configuré"); }
  try {
    await transport().sendMail({
      from: `"CAPSULE Paris 8" <${process.env.MAIL_USER}>`, to: r.email, replyTo: process.env.MAIL_USER, subject, text, ...(html ? { html } : {}),
      ...(method ? { icalEvent: { method, filename: "rendez-vous.ics", content: icsPatient(r, method) } } : {}),
    });
  } catch (e) { await journaliser({ ...base, statut: "echec", erreur: String(e.message || e).slice(0, 200) }); throw e; }
  await journaliser({ ...base, statut: "envoye" });
}

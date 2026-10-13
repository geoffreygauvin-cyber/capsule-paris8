import nodemailer from "nodemailer";
import { icsPatient } from "./rdv.mjs";

export const mailReady = () => !!(process.env.MAIL_USER && process.env.MAIL_PASS);
let tr;
function transport() {
  tr ??= nodemailer.createTransport({ service: "gmail", auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
  return tr;
}
// method : REQUEST (invitation / mise à jour), CANCEL (annulation), ou null (simple rappel avec invitation à jour)
export async function envoyer(r, { subject, text }, method) {
  if (!mailReady()) throw new Error("Envoi de mail non configuré");
  await transport().sendMail({
    from: `"CAPSULE Paris 8" <${process.env.MAIL_USER}>`, to: r.email, replyTo: process.env.MAIL_USER, subject, text,
    ...(method ? { icalEvent: { method, filename: "rendez-vous.ics", content: icsPatient(r, method) } } : {}),
  });
}

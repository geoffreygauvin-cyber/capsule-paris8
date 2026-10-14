// Lien personnel pour annuler ou demander un autre créneau, glissé dans les mails de rendez-vous.
// Aucun jeton n'est stocké : le lien est signé (HMAC) à partir de l'identifiant de la personne et de celui du rendez-vous.
// Il cesse donc de fonctionner de lui-même quand le rendez-vous disparaît, et il change si SESSION_SECRET change.
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "";
export const siteUrl = () => String(process.env.SITE_URL || process.env.URL || "https://www.capsule-paris8.fr").replace(/\/+$/, "");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Les UUID sont raccourcis (22 caractères au lieu de 36) ; tout autre identifiant (anciennes fiches) est encodé tel quel.
const enc = (id) => (UUID.test(id) ? "u" + Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url") : "s" + Buffer.from(id, "utf8").toString("base64url"));
function dec(s) {
  const t = s[0], b = s.slice(1);
  if (t === "u") { const x = Buffer.from(b, "base64url").toString("hex"); return x.length === 32 ? [x.slice(0, 8), x.slice(8, 12), x.slice(12, 16), x.slice(16, 20), x.slice(20)].join("-") : ""; }
  if (t === "s") return Buffer.from(b, "base64url").toString("utf8");
  return "";
}
const sig = (a, b) => createHmac("sha256", "rdv-lien|" + secret()).update(a + "." + b).digest("base64url").slice(0, 22);

export function lienRdv(patientId, rdvId) {
  if (!secret() || !patientId || !rdvId) return "";
  const a = enc(String(patientId)), b = enc(String(rdvId));
  return `${siteUrl()}/rdv?t=${a}.${b}.${sig(a, b)}`;
}
export function lireLien(t) {
  const [a, b, s, extra] = String(t || "").split(".");
  if (!a || !b || !s || extra !== undefined || !secret() || a.length > 200 || b.length > 200) return null;
  const good = sig(a, b);
  if (s.length !== good.length || !timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  const pid = dec(a), rid = dec(b);
  return pid && rid ? { pid, rid } : null;
}

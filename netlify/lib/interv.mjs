// Dossier des intervenant·es (superviseur·es, formateur·rices…) : pièces administratives à déposer avant l'ouverture de l'accès à la plateforme.
// - store « intervenants » : une fiche par personne (clé i/<id>) ; store « pieces » : les fichiers (clé <id>/<idPièce>) ; liste des pièces demandées : store « config », clé « pieces ».
// - Le lien de dépôt est signé (HMAC), il n'est pas stocké ; il change si SESSION_SECRET change.
import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./lien.mjs";

const secret = () => process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "";
const sig = (id) => createHmac("sha256", "dossier|" + secret()).update(id).digest("base64url").slice(0, 22);
export const lienDossier = (id) => (secret() && id ? `${siteUrl()}/dossier?t=${id}.${sig(id)}` : "");
export function lireDossier(t) {
  const [id, s, extra] = String(t || "").split(".");
  if (!id || !s || extra !== undefined || !secret() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const good = sig(id);
  return s.length === good.length && timingSafeEqual(Buffer.from(s), Buffer.from(good)) ? id : null;
}

export const FONCTIONS = ["Superviseur·e", "Intervenant·e", "Autre"];
export const MAX_PIECE = 4 * 1024 * 1024;
export const EXT_PIECE = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
export const PIECES_DEFAUT = [
  { id: "devis", label: "Devis", aide: "Devis signé pour la mission", obl: true },
  { id: "rib", label: "RIB", aide: "Relevé d’identité bancaire", obl: true },
  { id: "kbis", label: "Kbis ou avis de situation SIRENE", aide: "De moins de 3 mois", obl: true },
  { id: "identite", label: "Pièce d’identité", aide: "Recto et verso, en cours de validité", obl: true },
  { id: "urssaf", label: "Attestation de vigilance URSSAF", aide: "Attestation à jour", obl: true },
  { id: "assurance", label: "Assurance responsabilité civile professionnelle", aide: "", obl: false },
];
export const stores = () => ({ iv: getStore({ name: "intervenants", consistency: "strong" }), pc: getStore({ name: "pieces", consistency: "strong" }) });
export async function chargerPieces() {
  const v = await getStore("config").get("pieces", { type: "json" });
  return Array.isArray(v) && v.length ? v : PIECES_DEFAUT;
}
export function progression(rec, pieces) {
  const docs = rec.docs || {}, obl = pieces.filter((p) => p.obl);
  const manquantes = obl.filter((p) => !docs[p.id]).map((p) => p.label);
  return { total: obl.length, ok: obl.length - manquantes.length, manquantes, complet: manquantes.length === 0, deposees: pieces.filter((p) => docs[p.id]).length };
}
export async function charger(id) { return (await stores().iv.get("i/" + id, { type: "json" })) || null; }
export async function lister() {
  const { iv } = stores(), { blobs } = await iv.list({ prefix: "i/" });
  return (await Promise.all(blobs.map((b) => iv.get(b.key, { type: "json" })))).filter(Boolean).sort((a, z) => String(a.nom).localeCompare(String(z.nom), "fr"));
}
// Vue de la fiche pour le dossier (sans données inutiles).
export function vuePieces(rec, pieces) {
  const docs = rec.docs || {};
  return pieces.map((p) => ({ id: p.id, label: p.label, aide: p.aide || "", obl: !!p.obl, doc: docs[p.id] ? { nom: docs[p.id].nom, taille: docs[p.id].taille, le: docs[p.id].le } : null }));
}

// Relance des dossiers incomplets : mail hebdomadaire (fonction relance-dossiers) ou manuel (bouton « Relancer »).
// Réglage : store « config », clé « relance » { actif, jours } ; suivi par personne : rec.relance = { dernier, n }.
export async function cfgRelance() {
  const v = (await getStore("config").get("relance", { type: "json" })) || {};
  return { actif: v.actif !== false, jours: [7, 14].includes(Number(v.jours)) ? Number(v.jours) : 7 };
}
export function aRelancer(rec, pieces) { return !rec.valide && !!rec.email && !progression(rec, pieces).complet; }
export function texteRelance(rec, pieces) {
  const pr = progression(rec, pieces);
  const text = [`Bonjour ${rec.nom},`, "",
    `Votre dossier administratif CAPSULE n'est pas encore complet : il manque ${pr.manquantes.length > 1 ? "ces pièces" : "cette pièce"} :`,
    ...pr.manquantes.map((m) => "- " + m), "",
    "Merci de les déposer sur votre lien personnel :", lienDossier(rec.id), "",
    "Sans les pièces déposées en ligne, nous ne pourrons pas procéder au paiement de vos interventions. L'accès à la plateforme de l'équipe s'ouvre aussi une fois le dossier complet et vérifié.", "",
    "Formats acceptés : PDF, image (JPG, PNG) ou Word, 4 Mo maximum par pièce. Si vous avez déjà tout envoyé par un autre canal, répondez simplement à ce mail.", "",
    "L'équipe CAPSULE"].join("\n");
  return { subject: "Dossier administratif incomplet : pièces à déposer, CAPSULE Paris 8", text };
}
// Envoie la relance et note la date. `envoyer` est la fonction de mail ; lève l'erreur d'envoi.
export async function relancer(rec, pieces, envoyer, par, type) {
  await envoyer({ email: rec.email, prenom: rec.nom, id: "" }, texteRelance(rec, pieces), null, { modele: "Relance dossier intervenant·e", par, type });
  rec.relance = { dernier: new Date().toISOString(), n: (rec.relance?.n || 0) + 1 };
  await stores().iv.setJSON("i/" + rec.id, rec);
}

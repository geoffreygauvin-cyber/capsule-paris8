import { stores, lireDossier, charger, chargerPieces, progression, vuePieces, MAX_PIECE, EXT_PIECE } from "../lib/interv.mjs";
import { siteUrl } from "../lib/lien.mjs";
import { envoyer, mailReady } from "../lib/mail.mjs";

// Page /dossier : l'intervenant·e dépose ses pièces (devis, RIB, Kbis, pièce d'identité…) depuis un lien personnel signé, sans compte.
// L'accès à la plateforme est ouvert ensuite par l'équipe (Gestion RH › Intervenant·es). GET ne modifie rien.
export const config = { path: "/api/dossier" };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\\/]+/g, " ").trim().slice(0, n);

const vue = async (rec) => {
  const pieces = await chargerPieces(), p = progression(rec, pieces);
  return { ok: true, nom: rec.nom, fonction: rec.fonction || "", pieces: vuePieces(rec, pieces), ok_n: p.ok, total: p.total, complet: p.complet, valide: !!rec.valide };
};

export default async (req) => {
  const u = new URL(req.url);
  let b = {};
  if (req.method === "POST") { try { b = await req.json(); } catch { return J({ error: "Requête invalide." }, 400); } }
  const id = lireDossier(req.method === "POST" ? b.t : u.searchParams.get("t"));
  if (!id) return J({ error: "Ce lien n’est pas valide. Demandez-en un nouveau à la coordination CAPSULE." }, 404);
  const rec = await charger(id);
  if (!rec) return J({ error: "Ce dossier n’existe plus. Contactez la coordination CAPSULE." }, 404);
  if (req.method !== "POST") return J(await vue(rec));

  const { iv, pc } = stores(), pieces = await chargerPieces(), piece = pieces.find((p) => p.id === String(b.piece));
  if (!piece) return J({ error: "Pièce inconnue." }, 400);
  if (b.action === "supprimer") {
    if (rec.valide) return J({ error: "Le dossier est validé : contactez la coordination pour modifier une pièce." }, 403);
    if (rec.docs?.[piece.id]) { delete rec.docs[piece.id]; await pc.delete(id + "/" + piece.id); rec.notifie = false; await iv.setJSON("i/" + id, rec); }
    return J(await vue(rec));
  }
  if (b.action !== "deposer") return J({ error: "Action inconnue." }, 400);
  const nom = clean(b.nom, 120) || "piece", ext = nom.split(".").pop().toLowerCase();
  if (!EXT_PIECE[ext]) return J({ error: "Format non accepté : PDF, image (JPG, PNG) ou Word." }, 400);
  if (typeof b.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(b.data)) return J({ error: "Fichier invalide." }, 400);
  const buf = Buffer.from(b.data, "base64");
  if (!buf.length) return J({ error: "Fichier vide." }, 400);
  if (buf.length > MAX_PIECE) return J({ error: "Fichier trop lourd (4 Mo maximum). Réduisez-le ou envoyez-le en PDF compressé." }, 413);
  await pc.set(id + "/" + piece.id, buf, { metadata: { mime: EXT_PIECE[ext] } });
  rec.docs = { ...(rec.docs || {}), [piece.id]: { nom, mime: EXT_PIECE[ext], taille: buf.length, le: new Date().toISOString() } };
  const p = progression(rec, pieces);
  let prevenir = false;
  if (p.complet && !rec.notifie && !rec.valide) { rec.notifie = true; prevenir = true; }
  await iv.setJSON("i/" + id, rec);
  if (prevenir && mailReady()) {
    try { await envoyer({ email: process.env.MAIL_USER, prenom: "CAPSULE", id: "" }, { subject: `Dossier complet : ${rec.nom}`, text: `${rec.nom} a déposé toutes les pièces obligatoires de son dossier.\n\nÀ vérifier puis à valider dans Gestion RH › Intervenant·es :\n${siteUrl()}/gestion` }, null, { modele: "Dossier intervenant·e complet", par: "site", type: "auto" }); } catch (e) { console.error("notif dossier", e.message); }
  }
  return J(await vue(rec));
};

import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { resumePublic } from "../lib/capacite.mjs";
import { noter } from "../lib/compteur.mjs";

export const config = { path: "/api/demande" };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
const CRENEAUX = ["Lundi", "Mardi", "Mercredi"];

export default async (req) => {
  // GET : le formulaire demande si toutes les places sont prises (liste d'attente), pour prévenir la personne avant l'envoi
  if (req.method === "GET") return J({ complet: (await resumePublic().catch(() => ({}))).complet === true });
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }
  if (b.site) return J({ ok: true }); // piège anti-robot : champ caché rempli
  const prenom = clean(b.prenom, 60);
  const email = clean(b.email, 120).toLowerCase();
  const tel = clean(b.tel, 25);
  const message = clean(b.message, 400);
  const creneaux = (Array.isArray(b.creneaux) ? b.creneaux : []).filter((x) => CRENEAUX.includes(x));
  if (!prenom) return J({ error: "Indiquez un prénom." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ error: "Adresse mail invalide." }, 400);
  if (b.consentement !== true) return J({ error: "Merci de cocher la case de consentement." }, 400);

  const store = getStore("demandes");
  const { blobs } = await store.list({ prefix: "d/" });
  if (blobs.length >= 3000) return J({ error: "Service momentanément indisponible." }, 503);
  const recentes = await Promise.all(blobs.slice(-60).map((x) => store.get(x.key, { type: "json" })));
  const now = Date.now();
  if (recentes.some((r) => r && r.email === email && now - Date.parse(r.creeLe) < 10 * 60 * 1000)) return J({ ok: true });

  const id = randomUUID(), iso = new Date(now).toISOString();
  // Capacité atteinte : la demande entre directement en liste d'attente (ordre d'arrivée), sans rien perdre
  const attente = (await resumePublic().catch(() => ({}))).complet === true;
  const rec = { id, creeLe: iso, prenom, email, tel, creneaux, message, statut: attente ? "attente" : "nouvelle", ...(attente ? { attenteLe: iso, attenteAuto: true } : {}), assigne: "", rdv: "", notes: "", maj: iso };
  await store.setJSON("d/" + iso + "_" + id, rec);
  await noter(iso);
  return J({ ok: true, attente });
};

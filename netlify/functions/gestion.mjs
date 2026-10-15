import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, createHash, scryptSync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

import { norm, vue, lundi, jourLong, SALLES, HEURES, JOURS, LIEU, weekday, cap, parisToUTC, chargerTout } from "../lib/rdv.mjs";
import { texte, chargerModeles, DEFAUTS, VARIABLES, variables, rendre, manquants } from "../lib/modeles.mjs";
import { envoyer, mailReady } from "../lib/mail.mjs";
import { randomUUID } from "node:crypto";
import * as REG from "../lib/reglement.mjs";
import * as FI from "../lib/fiches.mjs";
import * as CP from "../lib/capacite.mjs";
import * as CO from "../lib/compteur.mjs";

export const config = { path: "/api/gestion" };

const MAIL_ET = [["Accueil : ton profil", "Les annonces de l’équipe s’affichent tout en haut (pense à cliquer sur « C’est lu »), puis ton emploi du temps de la semaine (rendez-vous patients, supervisions, réunions), tes heures de consultation, le nombre de patients suivis et ta prochaine supervision."], ["Demandes : prendre en charge", "Les demandes du site arrivent ici, classées par onglet. Ouvre une fiche, passe-la en « contactée », puis fixe le rendez-vous (jour, heure, salle). Une alerte te prévient d’un conflit, ou si la personne a déjà un rendez-vous la même semaine. Tu peux aussi déplacer une personne d’un onglet à l’autre à la main. Chaque mail de rendez-vous contient un lien : si la personne annule ou demande un autre créneau, le créneau est libéré et un bandeau apparaît sur sa fiche et sur ton Accueil (clique sur « C’est noté » une fois pris en compte). Quand toutes les places sont prises, les nouvelles demandes du site arrivent dans l’onglet « Liste d’attente », dans l’ordre d’arrivée : planifie la première dès qu’une place se libère (les admins règlent le nombre de places par étudiant·e avec « Régler »)."], ["Après chaque séance", "Dans « À confirmer » (Accueil) ou sur la fiche, indique si la séance a eu lieu ou si la personne est absente. Si elle a eu lieu, note le bien-être de la semaine et l’utilité de la séance (0 à 10). Chaque personne peut avoir plusieurs rendez-vous, numérotés 1, 2, 3…"], ["Calendrier, Patients, Messages, Ressources", "Calendrier : tous les rendez-vous, par thérapeute. Patients : la base avec le décompte des séances (sur 8) et les indicateurs généraux. Messages : mails types et historique. Ressources : documents utiles de l’équipe."], ["Supervisions et réunions : tu les programmes toi-même", "« + Programmer une séance ou une réunion » : choisis le type (supervision de groupe, individuelle ou réunion d’équipe), la date, l’heure, le lieu, un lien de visio si besoin et les personnes invitées. La séance s’ajoute à ton agenda et à celui des invités. Tu ne modifies ou ne supprimes que celles que tu as créées ; après la séance, note les présences."], ["Publications : réseaux sociaux", "Crée un visuel à partir d’un modèle (PNG, PDF ou PowerPoint), enregistre-le dans le planning avec sa date, et retrouve dans l’onglet Planning ce qui est prêt à publier, par réseau. Une publication passe en rouge la veille de sa date, pour ne pas l’oublier."]];
const MAIL_AD = [["Comptes : créer et gérer les comptes", "« Ajouter un compte » : prénom (accents acceptés), statut Admin ou Étudiant·e psy, code libre (8 caractères minimum) ou généré. Sur chaque ligne : « Envoyer l’accès » (mail avec identifiant, code et mode d’emploi) et le menu Actions : Voir le code, Changer le code (l’ancien cesse de marcher) et Supprimer. Le statut se change avec le menu déroulant, après confirmation."], ["Accès : à envoyer à chaque personne", "« Envoyer l’accès » envoie par mail l’identifiant, le code et le mode d’emploi complet correspondant à son statut, avec un rappel : ce tutoriel reste disponible dans Ressources. « Envoyer les accès par mail » (bloc d’export de Suivi d’activité) l’envoie à toute l’équipe d’un coup. Si le code est « non récupérable » (compte ancien), fais d’abord « Changer le code »."], ["Réunions & annonces", "Deux onglets. Réunions & supervisions : programme-les (ponctuelles ou chaque semaine, avec un lien de visio si besoin) et note les présences, avec retards et absences. Annonces : écris un message pour les étudiant·es, programmable et avec une durée d’affichage ; il s’affiche en haut de leur Accueil."], ["Gestion RH", "Suivi de l’équipe (présences, retards, absences, personnes à voir), entretiens privés (feedback, recadrage, point d’étape ; l’étudiant·e ne voit ni le motif ni les notes, seulement la date et le lieu) et règlement intérieur, avec ses signatures."], ["Suivi d’activité : les indicateurs", "Chiffres généraux (demandes, personnes suivies, séances réalisées, présence, satisfaction), parcours des personnes (attente avant la première séance, séances par personne, durée du suivi, écart entre deux séances), graphiques par mois et par statut, bien-être, satisfaction et changement perçu, puis le détail par étudiant·e. Données descriptives : une tendance, pas une preuve d’efficacité."], ["Exports et sauvegarde", "Dans Suivi d’activité, « Exporter les données » : patients, demandes, séances, heures par étudiant·e et journal des messages en CSV (Excel), ou sauvegarde complète en JSON. Ce sont des données personnelles : à conserver et à partager avec précaution."]];

const hx = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ETIQ = "font-size:11px;font-weight:600;letter-spacing:.12em;color:#7B206B;padding:18px 0 6px";
function mailAccesHtml(nom, role, code, origin) {
  const adm = role === "admin", pr = cap(nom), F = "font-family:Poppins,Segoe UI,Helvetica,Arial,sans-serif;";
  const steps = (l, from = 1) => l.map((x, i) => `<tr><td width="34" valign="top" style="padding:8px 12px 8px 0"><div style="width:26px;height:26px;border-radius:13px;background:#AE164E;color:#fff;font:700 13px/26px Arial,sans-serif;text-align:center">${i + from}</div></td><td style="padding:8px 0;${F}"><div style="font-size:14.5px;font-weight:600;color:#2B1A22">${hx(x[0])}</div><div style="font-size:13px;line-height:1.55;color:#5B4A52;margin-top:2px">${hx(x[1])}</div></td></tr>`).join("");
  const box = (t, c, bg) => `<td valign="top" width="50%" style="padding:0 6px 0 0"><div style="background:${bg};border-radius:14px;padding:14px 16px;${F}font-size:13px;line-height:1.5;color:#2B1A22"><div style="font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#7B206B;margin-bottom:4px">${t}</div>${c}</div></td>`;
  const lien = `${origin}/gestion`;
  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF5EB"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;${F}">
<tr><td style="padding:0 4px 14px"><table role="presentation" width="100%"><tr><td><div style="font-weight:700;font-size:20px;letter-spacing:.22em;color:#75151F">CAPSULE</div><div style="font-size:10px;letter-spacing:.14em;color:#7B206B;margin-top:2px">ESPACE ÉQUIPE · UNIVERSITÉ PARIS 8</div></td><td align="right"><span style="display:inline-block;background:${adm ? "#7B206B" : "#F8DCE4"};color:${adm ? "#fff" : "#AE164E"};border-radius:999px;padding:5px 14px;font-size:12px;font-weight:600">${adm ? "Admin" : "Étudiant·e psy"}</span></td></tr></table></td></tr>
<tr><td style="background:#AE164E;border-radius:20px;padding:22px 24px;color:#fff"><div style="font-size:24px;font-weight:700;line-height:1.2">Bonjour ${hx(pr)}</div>
<div style="font-size:14px;line-height:1.5;margin-top:8px;opacity:.95">${adm ? "Voici tes accès à la plateforme CAPSULE, en tant qu’administrateur·rice : tu gères l’équipe, les comptes et le suivi." : "Voici tes accès à la plateforme CAPSULE."} Garde ce message pour toi. Ce mode d’emploi reste disponible dans l’onglet Ressources, sous « Tutoriel de la plateforme ».</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px"><tr>
<td width="50%" style="padding-right:6px"><div style="background:#fff;border-radius:12px;padding:12px 14px;color:#2B1A22"><div style="font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#7B206B">IDENTIFIANT</div><div style="font:700 18px/1.3 Consolas,Menlo,monospace;margin-top:2px;word-break:break-all">${hx(nom)}</div></div></td>
<td width="50%" style="padding-left:6px"><div style="background:#fff;border-radius:12px;padding:12px 14px;color:#2B1A22"><div style="font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#7B206B">CODE</div><div style="font:700 18px/1.3 Consolas,Menlo,monospace;margin-top:2px;word-break:break-all">${hx(code)}</div></div></td></tr></table></td></tr>
<tr><td style="padding:14px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${box("SE CONNECTER", `<a href="${hx(lien)}" style="color:#AE164E;font-weight:600">${hx(lien.replace(/^https?:\/\//, ""))}</a><br>avec ton identifiant et ton code.`, "#F8DCE4")}${box("À SAVOIR", adm ? "Les admins ne sont pas comptés comme des étudiant·es : leurs séances n’entrent ni dans les heures de consultation ni dans celles de supervision. La session dure 8 h." : "Une séance réalisée = 1 h comptée. La session dure 8 h, puis il faut se reconnecter.", "#E9DCEF")}</tr></table></td></tr>
<tr><td style="${ETIQ}">${adm ? "ESPACE ADMIN" : "ESPACE ÉTUDIANT PSYCHOLOGUE"}</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps(adm ? MAIL_AD : MAIL_ET)}</table></td></tr>
${adm ? `<tr><td style="${ETIQ}">ESPACE ÉTUDIANT PSYCHOLOGUE</td></tr><tr><td style="font-size:13px;color:#5B4A52;line-height:1.55;padding-bottom:4px">En tant qu’admin, tu as aussi accès à tout l’espace étudiant psychologue :</td></tr><tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps(MAIL_ET)}</table></td></tr><tr><td style="padding-top:10px"><div style="background:#E9DCEF;border-radius:14px;padding:14px 16px;font-size:13px;line-height:1.5;color:#2B1A22"><b style="font-size:10.5px;letter-spacing:.12em;color:#7B206B">PRÉCAUTIONS</b><br>Tout admin peut lire les codes de tous les comptes. Quand un·e étudiant·e part, supprime son compte dans Comptes.</div></td></tr>` : ""}
<tr><td style="padding:18px 4px 0;font-size:11.5px;line-height:1.5;color:#7a6a72;border-top:1px solid #EBDDD6;margin-top:14px">Données de patients confidentielles. Ne partage jamais ton code ; déconnecte-toi sur un poste partagé. Si quelque chose ne marche pas, réponds simplement à ce mail.<br>L’équipe CAPSULE</td></tr>
</table></td></tr></table>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tes accès à la plateforme CAPSULE</title></head><body style="margin:0;background:#FDF5EB">${body}</body></html>`;
}
function mailAcces(nom, role, code, origin) {
  const adm = role === "admin", pr = cap(nom), liste = (adm ? MAIL_AD.concat([["Espace étudiant psychologue", "tu as aussi accès à tout l'espace étudiant psychologue (demandes, calendrier, patients, messages, ressources), comme les étudiant·es."]]) : MAIL_ET);
  const texte = [
    `Bonjour ${pr},`, "",
    adm ? "Voici tes accès à la plateforme CAPSULE, en tant qu'administrateur·rice." : "Voici tes accès à la plateforme CAPSULE, l'espace de l'équipe.", "",
    `Adresse : ${origin}/gestion`, `Identifiant : ${nom}`, `Code : ${code}`, "",
    "Garde ce message pour toi et ne partage jamais ton code. Ce mode d'emploi reste disponible dans l'onglet Ressources, sous « Tutoriel de la plateforme ». La session dure 8 h, puis il faut se reconnecter. Les données de patients sont confidentielles : déconnecte-toi sur un poste partagé.", "",
    "Comment ça marche", "",
    ...liste.map((x, i) => `${i + 1}. ${x[0]} : ${x[1]}`), "",
    adm ? "Les admins ne sont pas comptés comme des étudiant·es : leurs séances n'entrent ni dans les heures de consultation ni dans celles de supervision. Quand quelqu'un quitte l'équipe, supprime son compte dans Comptes." : "Une séance réalisée = 1 h comptée.", "",
    "Si quelque chose ne marche pas, réponds simplement à ce mail.", "",
    "À très vite,", "L'équipe CAPSULE",
  ].join("\n");
  return { sujet: "Tes accès à la plateforme CAPSULE", texte, html: mailAccesHtml(nom, role, code, origin) };
}


const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const h = (x) => createHash("sha256").update(String(x)).digest();
const STATUTS_PRES = ["present", "retard", "excuse", "absent"];
const CATS = ["Documents", "Modèles", "Protocoles", "Formation", "Liens utiles"];
const MIMES = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword", odt: "application/vnd.oasis.opendocument.text", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", txt: "text/plain" };
const MAX_FICHIER = 4 * 1024 * 1024;
const ROLES = ["etudiant", "admin"];
const nrm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "-");
const rlv = (v) => (v?.role === "superviseur" ? "desactive" : ROLES.includes(v?.role) ? v.role : "etudiant");
const HEURES_SUP = Array.from({ length: 23 }, (_, k) => { const m = 8 * 60 + k * 30; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + (m % 60 ? "30" : "00"); });
const DUREES = [60, 90, 120, 180];
const fin = (h, d) => { const m = mn(h) + d; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const mn = (h) => +h.slice(0, 2) * 60 + +h.slice(3);
const STATUTS = ["nouvelle", "a_recontacter", "attente", "contactee", "rdv_fixe", "en_cours", "terminee", "sans_suite"];

// GESTION_COMPTES = "violette:code1,equipe:code2"
function comptes() {
  return Object.fromEntries((process.env.GESTION_COMPTES || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => { const i = s.indexOf(":"); return [s.slice(0, i).trim().toLowerCase(), s.slice(i + 1)]; }));
}
const ckey = () => createHash("sha256").update("codes|" + (process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "")).digest();
const encCode = (t) => { const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", ckey(), iv), e = Buffer.concat([c.update(String(t), "utf8"), c.final()]); return [iv, c.getAuthTag(), e].map((x) => x.toString("base64")).join("."); };
const decCode = (v) => { try { const [iv, tag, e] = String(v).split(".").map((x) => Buffer.from(x, "base64")), d = createDecipheriv("aes-256-gcm", ckey(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(e), d.final()]).toString("utf8"); } catch { return null; } };
const secret = () => process.env.SESSION_SECRET || process.env.GESTION_COMPTES || "";
const sign = (p) => createHmac("sha256", secret()).update(p).digest("base64url");
function makeToken(user, role, k) { const p = Buffer.from(JSON.stringify({ u: user, r: role, k, e: Date.now() + 8 * 3600 * 1000 })).toString("base64url"); return p + "." + sign(p); }
const bind = (x) => h(x).toString("hex").slice(0, 10);
const hashCode = (code, salt) => scryptSync(String(code), salt, 32).toString("hex");
const NAME = /^[a-z0-9._-]{2,30}$/;
const WORDS = ["lune","pivot","cedre","brume","sable","tilleul","ardoise","rivage","opale","jonc","orage","figuier","galet","prune","aube","lilas","bruyere","falaise"];
function genCode() { const b = randomBytes(8); return [0,1,2].map((i) => WORDS[b[i] % WORDS.length]).join("-") + (10 + (b[3] % 90)); }
function checkToken(t) {
  if (!secret() || typeof t !== "string") return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const good = sign(p);
  if (s.length !== good.length || !timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return o.e > Date.now() ? o : null; } catch { return null; }
}
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").slice(0, n);

const mesures = (b) => {
  const o = {}; const n = (v) => (v === null || v === "" || v === undefined ? null : Number(v));
  const be = n(b.bienEtre), sa = n(b.satisfaction);
  if (be !== null && Number.isInteger(be) && be >= 0 && be <= 10) o.bienEtre = be;
  if (sa !== null && Number.isInteger(sa) && sa >= 0 && sa <= 10) o.satisfaction = sa;
  return o;
};
export default async (req) => {
  const ac = getStore("comptes");
  if (req.method === "GET") return J({ comptesPrincipaux: Object.keys(comptes()).length, secret: !!process.env.SESSION_SECRET });
  if (req.method !== "POST") return J({ error: "Méthode refusée" }, 405);
  let b;
  try { b = await req.json(); } catch { return J({ error: "Requête invalide" }, 400); }

  if (b.action === "login") {
    const c = comptes(); const u = nrm(b.compte);
    await new Promise((r) => setTimeout(r, 600)); // freine les essais répétés
    if (u in c) {
      const ov = await getStore("codes").get(u, { type: "json" });
      if (ov) {
        if (!timingSafeEqual(Buffer.from(hashCode(String(b.code ?? "").trim(), ov.salt)), Buffer.from(ov.hash))) return J({ error: "Compte ou code incorrect." }, 401);
        return J({ ok: true, token: makeToken(u, "admin", "o" + ov.hash.slice(0, 9)), compte: u });
      }
      if (!timingSafeEqual(h(String(b.code ?? "").trim()), h(c[u].trim()))) return J({ error: "Compte ou code incorrect." }, 401);
      return J({ ok: true, token: makeToken(u, "admin", bind(c[u])), compte: u });
    }
    const a = NAME.test(u) ? await ac.get(u, { type: "json" }) : null;
    if (!a || !timingSafeEqual(Buffer.from(hashCode(String(b.code ?? "").trim(), a.salt)), Buffer.from(a.hash))) return J({ error: "Compte ou code incorrect." }, 401);
    if (a.role === "superviseur") return J({ error: "Ce compte a été désactivé." }, 401);
    return J({ ok: true, token: makeToken(u, "membre", a.hash.slice(0, 10)), compte: u });
  }

  // Profils (photo, titre, présentation, contact) : lecture « forte » pour qu'un enregistrement soit relu tel quel juste après.
  const profils = () => getStore({ name: "profils", consistency: "strong" });
  const rls = getStore("roles"), SEED = { violette: "etudiant" };
  // Statut spécial « Service technique » : droits admin permanents, titre fixe, onglet Plateformes (voir les deux espaces côte à côte).
  const TECH = ["violette"];
  const prinRole = async (n) => { if (TECH.includes(n)) return "admin"; const v = await rls.get(n, { type: "json" }); return ["admin", "etudiant"].includes(v?.role) ? v.role : SEED[n] || "admin"; };
  const tk = checkToken(b.token);
  if (!tk) return J({ error: "Session expirée, reconnectez-vous." }, 401);
  const user = tk.u; let role = "admin";
  if (tk.r === "admin") {
    if (!(user in comptes())) return J({ error: "Session expirée, reconnectez-vous." }, 401);
    const ov = await getStore("codes").get(user, { type: "json" });
    if ((ov ? "o" + ov.hash.slice(0, 9) : bind(comptes()[user])) !== tk.k) return J({ error: "Session expirée, reconnectez-vous." }, 401);
    role = await prinRole(user);
  }
  else {
    const acc = await ac.get(user, { type: "json" });
    if (!(acc?.hash || "").startsWith(tk.k || "!")) return J({ error: "Session expirée, reconnectez-vous." }, 401);
    if (acc.role === "superviseur") return J({ error: "Ce compte a été désactivé." }, 401);
    role = ROLES.includes(acc.role) ? acc.role : "etudiant";
  }
  if (TECH.includes(user)) role = "admin"; // Service technique : admin quel que soit le type de compte (principal ou créé dans l'onglet Comptes)
  const admin = role === "admin", sup = role === "superviseur";
  const store = getStore("demandes");
  // Rôles : admin (tout), etudiant (espace étudiant psychologue), superviseur (espace gestion : planning, supervision, activité, efficacité ; pas de coordonnées de patients)
  if (sup && !["list", "profil_photo", "res_get", "sup_list", "sup_save", "sup_delete", "sup_presence"].includes(b.action)) return J({ error: "Action non autorisée pour un compte superviseur." }, 403);
  const rolesMap = async () => { const { blobs } = await ac.list(); const m = Object.fromEntries(await Promise.all(Object.keys(comptes()).map(async (k) => [k, await prinRole(k)]))); for (const x of blobs) { const v = await ac.get(x.key, { type: "json" }); if (v?.role === "superviseur") continue; m[x.key] = ROLES.includes(v?.role) ? v.role : "etudiant"; } for (const t of TECH) if (t in m) m[t] = "admin"; return m; };

  if (["comptes_list", "compte_create", "compte_reset", "compte_delete", "compte_role", "compte_code", "acces_list", "acces_apercu", "acces_mail"].includes(b.action)) {
    if (!admin) return J({ error: "Réservé aux administrateurs." }, 403);
    const c = comptes(); const n = nrm(b.nom);
    const prin = async () => Object.fromEntries(await Promise.all(Object.keys(c).map(async (k) => [k, await prinRole(k)])));

    const codeDe = async (nom) => {
      if (nom in c) { const ov = await getStore("codes").get(nom, { type: "json" }); return ov ? (ov.enc ? decCode(ov.enc) : null) : c[nom]; }
      const a = NAME.test(nom) ? await ac.get(nom, { type: "json" }) : null; return a && a.enc ? decCode(a.enc) : null;
    };
    if (b.action === "acces_list") { const es = getStore("emails"), { blobs } = await es.list(), out = {}; for (const x of blobs) { const v = await es.get(x.key, { type: "json" }); if (v?.email) out[x.key] = v.email; } return J({ ok: true, emails: out, mail: mailReady() }); }
    if (b.action === "acces_apercu" || b.action === "acces_mail") {
      const rm = await rolesMap(); if (!(n in rm)) return J({ error: "Compte introuvable." }, 404);
      const code = await codeDe(n); if (!code) return J({ error: "Code non récupérable pour " + cap(n) + " : utilisez d'abord « Changer le code »." }, 404);
      const mailTxt = mailAcces(n, rm[n] === "admin" ? "admin" : "etudiant", code, new URL(req.url).origin);
      if (b.action === "acces_apercu") return J({ ok: true, ...mailTxt });
      const email = String(b.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ error: "Adresse e-mail invalide." }, 400);
      if (!mailReady()) return J({ error: "L'envoi de mail n'est pas configuré sur ce site : utilisez « Ouvrir dans ma messagerie »." }, 400);
      await getStore("emails").setJSON(n, { email });
      try { await envoyer({ email, prenom: cap(n), id: "" }, { subject: mailTxt.sujet, text: mailTxt.texte, html: mailTxt.html }, null, { modele: "Accès à la plateforme", par: user, type: "manuel" }); }
      catch (e) { return J({ error: "Envoi impossible : " + String(e.message || e).slice(0, 120) }, 502); }
      return J({ ok: true });
    }
    if (b.action === "compte_code") {
      let code = null;
      if (n in c) { const ov = await getStore("codes").get(n, { type: "json" }); code = ov ? (ov.enc ? decCode(ov.enc) : null) : c[n]; }
      else { const a = NAME.test(n) ? await ac.get(n, { type: "json" }) : null; if (!a) return J({ error: "Compte introuvable." }, 404); code = a.enc ? decCode(a.enc) : null; }
      return code ? J({ ok: true, code }) : J({ error: "Ce code n’est pas récupérable (compte créé avant cette fonction) : utilisez « Changer le code »." }, 404);
    }
    if (b.action === "compte_reset" && n in c) {
      const code = String(b.code || "").trim() || genCode(), salt = randomBytes(16).toString("hex");
      if (code.length < 8) return J({ error: "Code trop court (8 caractères minimum)." }, 400);
      await getStore("codes").setJSON(n, { salt, hash: hashCode(code, salt), enc: encCode(code), le: new Date().toISOString(), par: user });
      const { blobs } = await ac.list();
      return J({ ok: true, code, prin: await prin(), membres: (await Promise.all(blobs.map((x) => ac.get(x.key, { type: "json" })))).filter(Boolean).map((v) => ({ nom: v.nom, creeLe: v.creeLe, creePar: v.creePar, role: TECH.includes(v.nom) ? "admin" : rlv(v) })), principaux: Object.keys(c) });
    }
    if (b.action === "compte_role" && n in c) {
      if (TECH.includes(n)) return J({ error: cap(n) + " a le statut Service technique : il ne se change pas ici." }, 400);
      if (!["admin", "etudiant"].includes(b.role)) return J({ error: "Statut inconnu." }, 400);
      if (b.role !== "admin" && !(await Promise.all(Object.keys(c).filter((k) => k !== n).map(prinRole))).includes("admin")) return J({ error: "Il doit rester au moins un compte admin." }, 400);
      await rls.setJSON(n, { role: b.role });
      const { blobs } = await ac.list();
      return J({ ok: true, prin: await prin(), membres: (await Promise.all(blobs.map((x) => ac.get(x.key, { type: "json" })))).filter(Boolean).map((v) => ({ nom: v.nom, creeLe: v.creeLe, creePar: v.creePar, role: TECH.includes(v.nom) ? "admin" : rlv(v) })), principaux: Object.keys(c) });
    }
    if (b.action !== "comptes_list") {
      if (!NAME.test(n) || n in c) return J({ error: "Nom invalide (2 à 30 caractères : lettres, chiffres, . _ -) ou déjà réservé." }, 400);
      if (b.action === "compte_create" && b.role && !ROLES.includes(b.role)) return J({ error: "Statut inconnu." }, 400);
      if (b.action === "compte_create" && await ac.get(n, { type: "json" })) return J({ error: "Ce compte existe déjà." }, 400);
      if (b.action !== "compte_create" && !(await ac.get(n, { type: "json" }))) return J({ error: "Compte introuvable." }, 404);
      if (b.action === "compte_delete") { await ac.delete(n); await profils().delete(n); }
      else if (b.action === "compte_role") {
        if (!ROLES.includes(b.role)) return J({ error: "Statut inconnu." }, 400);
        const old = await ac.get(n, { type: "json" }); await ac.setJSON(n, { ...old, role: b.role });
      }
      else {
        const code = String(b.code || "").trim() || genCode();
        if (code.length < 8) return J({ error: "Code trop court (8 caractères minimum)." }, 400);
        const salt = randomBytes(16).toString("hex");
        const old = await ac.get(n, { type: "json" });
        await ac.setJSON(n, { nom: n, salt, hash: hashCode(code, salt), enc: encCode(code), creeLe: old?.creeLe || new Date().toISOString(), creePar: old?.creePar || user, role: old?.role || (ROLES.includes(b.role) ? b.role : "etudiant") });
        const { blobs } = await ac.list();
        return J({ ok: true, code, membres: await Promise.all(blobs.map(async (x) => { const v = await ac.get(x.key, { type: "json" }); return { nom: v.nom, creeLe: v.creeLe, creePar: v.creePar, role: TECH.includes(v.nom) ? "admin" : rlv(v) }; })), principaux: Object.keys(c) });
      }
    }
    const { blobs } = await ac.list();
    const membres = (await Promise.all(blobs.map((x) => ac.get(x.key, { type: "json" })))).filter(Boolean).map((v) => ({ nom: v.nom, creeLe: v.creeLe, creePar: v.creePar, role: TECH.includes(v.nom) ? "admin" : rlv(v) }));
    return J({ ok: true, membres, principaux: Object.keys(c), prin: await prin() });
  }

  if (b.action === "list") {
    const { blobs } = await store.list({ prefix: "d/" });
    let items = (await Promise.all(blobs.map((x) => store.get(x.key, { type: "json" })))).filter(Boolean).map(norm);
    const capacite = sup ? null : CP.calcul(items, await CP.etudiants(), await CP.chargerCfg());
    if (sup) items = items.map((i) => ({ id: i.id, creeLe: i.creeLe, prenom: i.prenom, statut: i.statut, assigne: i.assigne, therapeute: i.therapeute, seances: i.seances || [], rdvs: i.rdvs || [], changement: i.changement, creneaux: [], notes: "", email: "", tel: "" }));
    items.sort((a, z) => z.creeLe.localeCompare(a.creeLe));
    const { blobs: cb } = await ac.list();
    const rs = getStore("ressources"); const { blobs: rb } = await rs.list({ prefix: "m/" });
    const ressources = (await Promise.all(rb.map((x) => rs.get(x.key, { type: "json" })))).filter(Boolean).sort((a, z) => z.le.localeCompare(a.le));
    const ps = profils(); const { blobs: pb } = await ps.list();
    const profs = await Promise.all(pb.map(async (x) => [x.key, (await ps.get(x.key, { type: "json" })) || {}]));
    const photos = Object.fromEntries(profs.filter((x) => x[1].photo).map((x) => [x[0], x[1].photo]));
    const titres = Object.fromEntries(profs.filter((x) => x[1].titre).map((x) => [x[0], x[1].titre])); for (const n of TECH) titres[n] = "Service technique";
    const bios = Object.fromEntries(profs.filter((x) => x[1].bio).map((x) => [x[0], x[1].bio]));
    const contacts = Object.fromEntries(profs.filter((x) => x[1].email || x[1].tel).map((x) => [x[0], { email: x[1].email || "", tel: x[1].tel || "" }]));
    const roles = await rolesMap();
    return J({ ok: true, items, capacite, compte: user, admin, role, roles, technique: TECH.includes(user), techniques: TECH, photos, titres, bios, contacts, ressources, equipe: Object.keys(roles).filter((k) => roles[k] !== "superviseur"), superviseurs: Object.keys(roles).filter((k) => roles[k] === "superviseur" || roles[k] === "admin"), cfg: { heuresSup: HEURES_SUP, durees: DUREES, categories: CATS, seancesMax: 8, salles: SALLES, heures: HEURES, jours: JOURS, lieu: LIEU, mail: mailReady(), calUrl: process.env.CAL_TOKEN ? "/api/calendrier.ics?k=" + process.env.CAL_TOKEN : "" } });
  }

  const key = async (id) => { const { blobs } = await store.list({ prefix: "d/" }); const k = blobs.find((x) => x.key.endsWith("_" + id)); return k && k.key; };


  const noms = async () => { const m = await rolesMap(); return Object.keys(m).filter((k) => m[k] !== "superviseur"); };
  const mailMsg = async (fn) => { if (!mailReady()) return "non_configure"; try { await fn(); return "envoye"; } catch (e) { console.error(e); return "echec"; } };

  if (b.action === "planifier") {
    const all = await chargerTout(store);
    const cur = all.find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Demande introuvable." }, 404);
    const r = cur.rec;
    const date = String(b.date || ""), heure = String(b.heure || ""), salle = String(b.salle || ""), th = String(b.therapeute || "").toLowerCase();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !JOURS.includes(weekday(date))) return J({ error: "Les rendez-vous ont lieu du lundi au mercredi." }, 400);
    if (!HEURES.includes(heure) || !SALLES.includes(salle)) return J({ error: "Créneau ou salle invalide." }, 400);
    if (!(await noms()).includes(th)) return J({ error: "Thérapeute inconnu·e." }, 400);
    if (parisToUTC(date, heure) < Date.now()) return J({ error: "Ce créneau est déjà passé." }, 400);
    const ex = b.rdvId ? r.rdvs.find((y) => y.id === String(b.rdvId)) : null;
    if (b.rdvId && !ex) return J({ error: "Rendez-vous introuvable." }, 404);
    const meme = (y) => y.date === date && y.heure === heure;
    if (r.rdvs.some((y) => y !== ex && meme(y))) return J({ error: r.prenom + " a déjà un rendez-vous à cette heure." }, 409);
    const autres = all.filter((x) => x.rec.id !== r.id).flatMap((x) => x.rec.rdvs.filter(meme));
    if (autres.some((y) => y.salle === salle)) return J({ error: salle + " est déjà occupée à cette heure." }, 409);
    if (autres.some((y) => y.therapeute === th)) return J({ error: cap(th) + " a déjà un rendez-vous à cette heure." }, 409);
    const ss = getStore("supervisions"), { blobs: sb } = await ss.list();
    for (const x of sb) { const v = await ss.get(x.key, { type: "json" }); if (v && v.date === date && (v.participants || []).includes(th) && mn(v.heure) < mn(heure) + 60 && mn(heure) < mn(v.heure) + v.duree) return J({ error: cap(th) + " est en supervision de " + v.heure + " à " + fin(v.heure, v.duree) + " ce jour-là." }, 409); }
    const cfgCap = await CP.chargerCfg();
    if (cfgCap.actif && (await CP.etudiants()).includes(th)) { // capacité : une personne de plus pour cet·te étudiant·e ?
      const max = cfgCap.parEtudiant[th] || cfgCap.defaut, suivies = all.filter((x) => x.rec.id !== r.id && CP.enSuivi(x.rec) && x.rec.assigne === th).length;
      if (!(CP.enSuivi(r) && r.assigne === th) && suivies >= max && !(admin && b.confirmerCapacite)) return J({ error: cap(th) + " suit déjà " + suivies + " personne" + (suivies > 1 ? "s" : "") + " (maximum " + max + ").", alerteCapacite: true, peutForcer: admin }, 409);
    }
    const sem = lundi(date);
    const dejaSem = [...r.rdvs.filter((y) => y !== ex), ...(r.seances || [])].filter((y) => lundi(y.date) === sem);
    if (dejaSem.length && !b.confirmerSemaine) return J({ error: r.prenom + " a déjà " + dejaSem.length + " rendez-vous cette semaine-là (" + dejaSem.map((y) => jourLong(y.date)).join(", ") + "). Est-ce voulu ?", alerteSemaine: true }, 409);
    const x = ex || { id: randomUUID(), uid: randomUUID(), seq: -1 };
    const modif = !!ex; x.seq = (x.seq || 0) + 1; if (!ex) x.seq = 0;
    Object.assign(x, { date, heure, salle, therapeute: th, rappelEnvoye: false });
    if (!ex) r.rdvs.push(x);
    r.rdvs.sort((p1, p2) => (p1.date + p1.heure).localeCompare(p2.date + p2.heure));
    Object.assign(r, { assigne: th, statut: "rdv_fixe", maj: new Date().toISOString(), majPar: user });
    delete r.attenteLe;
    let mail = "non_envoye";
    if (b.envoyer) mail = await mailMsg(async () => { const v = vue(r, x); await envoyer(v, await texte(modif ? "modification" : "invitation", v), "REQUEST", { modele: modif ? "modification" : "invitation", par: user, type: "auto" }); });
    x.invitEnvoyee = mail === "envoye";
    await store.setJSON(cur.key, r);
    return J({ ok: true, item: r, mail });
  }
  if (b.action === "annuler_rdv" || b.action === "renvoyer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Rendez-vous introuvable." }, 404);
    const r = cur.rec, x = r.rdvs.find((y) => y.id === String(b.rdvId)); if (!x) return J({ error: "Rendez-vous introuvable." }, 404);
    let mail = "non_envoye";
    if (b.action === "renvoyer") { mail = await mailMsg(async () => { const v = vue(r, x); await envoyer(v, await texte("invitation", v), "REQUEST", { modele: "invitation", par: user, type: "auto" }); }); if (mail === "envoye") x.invitEnvoyee = true; }
    else {
      x.seq = (x.seq || 0) + 1;
      if (b.envoyer && x.invitEnvoyee) mail = await mailMsg(async () => { const v = vue(r, x); await envoyer(v, await texte("annulation", v), "CANCEL", { modele: "annulation", par: user, type: "auto" }); });
      r.rdvs = r.rdvs.filter((y) => y !== x);
      if (!r.rdvs.length && r.statut === "rdv_fixe") r.statut = "a_recontacter";
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r, mail });
  }

  if (b.action === "demandes_mois") { // historique des demandes par mois (admins) : voir netlify/lib/compteur.mjs
    if (!admin) return J({ error: "Réservé aux administrateurs." }, 403);
    return J({ ok: true, ...(await CO.parMois()) });
  }
  if (b.action === "capacite_save") {
    if (!admin) return J({ error: "Réservé aux administrateurs." }, 403);
    const etu = await CP.etudiants(), nb = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null; };
    const defaut = nb(b.defaut); if (!defaut) return J({ error: "Indiquez un nombre de personnes entre 1 et 20." }, 400);
    const parEtudiant = {};
    for (const n of etu) { const v = (b.parEtudiant || {})[n]; if (v === "" || v === null || v === undefined) continue; if (!nb(v)) return J({ error: "Nombre invalide pour " + cap(n) + " (entre 1 et 20)." }, 400); if (nb(v) !== defaut) parEtudiant[n] = nb(v); }
    await CP.enregistrerCfg({ actif: b.actif === true, defaut, parEtudiant }, user);
    const items = (await chargerTout(store)).map((x) => x.rec);
    return J({ ok: true, capacite: CP.calcul(items, etu, await CP.chargerCfg()) });
  }
  if (b.action === "attente_mettre") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Demande introuvable." }, 404);
    const r = cur.rec;
    if (r.statut === "attente") return J({ error: r.prenom + " est déjà en liste d'attente." }, 409);
    if (r.rdvs.length) return J({ error: r.prenom + " a déjà un rendez-vous : annulez-le avant de la mettre en liste d'attente." }, 409);
    if (!["nouvelle", "a_recontacter", "contactee"].includes(r.statut)) return J({ error: "Cette fiche ne peut pas être mise en liste d'attente." }, 400);
    r.statut = "attente"; r.attenteLe = new Date().toISOString(); r.maj = r.attenteLe; r.majPar = user;
    let mail = "non_envoye";
    if (b.envoyer) mail = await mailMsg(async () => envoyer(r, await texte("attente", r), null, { modele: "attente", par: user, type: "manuel" }));
    await store.setJSON(cur.key, r);
    return J({ ok: true, item: r, mail });
  }

  if (b.action === "profil_photo") {
    const ps = profils(), ph = String(b.photo || "");
    const prev = (await ps.get(user, { type: "json" })) || {};
    if (!ph) { const { photo: _p, ...rest } = prev; if (Object.keys(rest).length) await ps.setJSON(user, rest); else await ps.delete(user); return J({ ok: true, photo: "" }); }
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(ph) || ph.length > 70000) return J({ error: "Image invalide ou trop lourde." }, 400);
    await ps.setJSON(user, { ...prev, photo: ph }); return J({ ok: true, photo: ph });
  }
  if (b.action === "profil_titre") {
    if (TECH.includes(user)) return J({ error: "Ton titre est lié au statut Service technique : il ne se change pas." }, 400);
    const ps = profils(), t = clean(b.titre, 40).replace(/\s+/g, " ").trim();
    const prev = (await ps.get(user, { type: "json" })) || {};
    const next = { ...prev }; if (t) next.titre = t; else delete next.titre;
    if (Object.keys(next).length) await ps.setJSON(user, next); else await ps.delete(user);
    return J({ ok: true, titre: t });
  }
  if (b.action === "profil_bio") {
    const ps = profils(), t = clean(b.bio, 240).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const prev = (await ps.get(user, { type: "json" })) || {};
    const next = { ...prev }; if (t) next.bio = t; else delete next.bio;
    if (Object.keys(next).length) await ps.setJSON(user, next); else await ps.delete(user);
    return J({ ok: true, bio: t });
  }
  if (b.action === "profil_contact") {
    const ps = profils(), email = clean(b.email, 120).trim().toLowerCase(), tel = clean(b.tel, 25).replace(/[^0-9+().\s-]/g, "").replace(/\s+/g, " ").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ error: "Adresse mail invalide." }, 400);
    if (tel && tel.replace(/\D/g, "").length < 6) return J({ error: "Numéro de téléphone invalide." }, 400);
    const prev = (await ps.get(user, { type: "json" })) || {};
    const next = { ...prev }; if (email) next.email = email; else delete next.email; if (tel) next.tel = tel; else delete next.tel;
    if (Object.keys(next).length) await ps.setJSON(user, next); else await ps.delete(user);
    return J({ ok: true, email, tel });
  }
  if (b.action === "creer") {
    const prenom = clean(b.prenom, 60).trim(), email = clean(b.email, 120).trim().toLowerCase(), tel = clean(b.tel, 25).trim();
    if (!prenom) return J({ error: "Indiquez un prénom." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return J({ error: "Adresse mail invalide." }, 400);
    const id = randomUUID(), now = new Date().toISOString();
    const rec = { id, creeLe: now, prenom, email, tel, creneaux: [], message: "", statut: "a_recontacter", assigne: "", notes: "", source: "manuel", seances: [], maj: now, majPar: user };
    await store.setJSON("d/" + now + "_" + id, rec); return J({ ok: true, item: rec });
  }
  if (b.action === "seance_issue" || b.action === "seance_supprimer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Introuvable." }, 404);
    const r = cur.rec; r.seances = r.seances || [];
    if (b.action === "seance_issue") {
      const x = r.rdvs.find((y) => y.id === String(b.rdvId)); if (!x) return J({ error: "Pas de rendez-vous en cours." }, 400);
      if (!["realisee", "absence"].includes(b.issue)) return J({ error: "Issue invalide." }, 400);
      if (parisToUTC(x.date, x.heure) > Date.now()) return J({ error: "Ce rendez-vous n'a pas encore eu lieu." }, 400);
      const sc = { date: x.date, heure: x.heure, salle: x.salle, therapeute: x.therapeute, issue: b.issue, par: user, le: new Date().toISOString() };
      if (b.issue === "realisee") Object.assign(sc, mesures(b)); r.seances.push(sc);
      r.rdvs = r.rdvs.filter((y) => y !== x);
      r.statut = r.rdvs.length ? "rdv_fixe" : b.issue === "realisee" ? "en_cours" : "a_recontacter";
    } else {
      const i = Number(b.index); if (!Number.isInteger(i) || !r.seances[i]) return J({ error: "Séance introuvable." }, 404);
      r.seances.splice(i, 1);
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r });
  }

  if (b.action === "seance_mesure" || b.action === "changement") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Introuvable." }, 404);
    const r = cur.rec; r.seances = r.seances || [];
    if (b.action === "seance_mesure") {
      const i = Number(b.index); const sc = r.seances[i];
      if (!Number.isInteger(i) || !sc || sc.issue !== "realisee") return J({ error: "Séance introuvable." }, 404);
      delete sc.bienEtre; delete sc.satisfaction; Object.assign(sc, mesures(b)); sc.mesurePar = user;
    } else {
      if (!r.seances.some((x) => x.issue === "realisee")) return J({ error: "Aucune séance réalisée." }, 400);
      const v = b.valeur === null || b.valeur === "" || b.valeur === undefined ? null : Number(b.valeur);
      if (v === null) delete r.changement; else if (Number.isInteger(v) && v >= 1 && v <= 7) r.changement = { v, le: new Date().toISOString(), par: user }; else return J({ error: "Valeur invalide." }, 400);
    }
    r.maj = new Date().toISOString(); r.majPar = user; await store.setJSON(cur.key, r);
    return J({ ok: true, item: r });
  }

  if (b.action === "sup_list" || b.action === "sup_save" || b.action === "sup_delete" || b.action === "sup_presence") {
    const ss = getStore("supervisions");
    const toutes = async () => { const { blobs } = await ss.list(); return (await Promise.all(blobs.map((x) => ss.get(x.key, { type: "json" })))).filter(Boolean).sort((a, z) => (a.date + a.heure).localeCompare(z.date + z.heure)); };
    /* Présences : un·e admin (ou la personne qui a programmé la séance) voit le détail (retard, excusé·e, motif). Les autres participant·es voient seulement présent·e / absent·e pour les autres,
       et leur propre statut (retard compris) sans le motif. */
    const masque = (x) => {
      if (x.type === "entretien" && !admin) return { ...x, titre: "", motif: undefined, compteRendu: undefined, notes: undefined };
      if (x.statuts && !admin && x.creePar !== user) {
        const s = Object.fromEntries(Object.entries(x.statuts).map(([n, v]) => [n, n === user ? { s: v.s, ...(v.min ? { min: v.min } : {}) } : { s: v.s === "retard" ? "present" : v.s === "excuse" ? "absent" : v.s }]));
        return { ...x, statuts: s };
      }
      return x;
    };
    if (b.action === "sup_list") { let l = await toutes(); if (role === "etudiant") l = l.filter((x) => (x.participants || []).includes(user) || x.creePar === user); return J({ ok: true, items: l.map(masque) }); }
    const own = (x) => admin || x.creePar === user;
    if (b.action === "sup_delete") {
      const l = await toutes(), x = l.find((y) => y.id === String(b.id)); if (!x) return J({ error: "Séance introuvable." }, 404);
      if (!own(x)) return J({ error: "Vous ne pouvez supprimer que vos propres séances." }, 403);
      const cibles = (b.serie && x.serie ? l.filter((y) => y.serie === x.serie && y.date >= x.date) : [x]).filter(own);
      for (const y of cibles) await ss.delete(y.id);
      return J({ ok: true, supprimes: cibles.map((y) => y.id) });
    }
    if (b.action === "sup_presence") {
      const x = await ss.get(String(b.id), { type: "json" }); if (!x) return J({ error: "Séance introuvable." }, 404);
      if (!own(x)) return J({ error: "Réservé à la personne qui a programmé la séance." }, 403);
      if (parisToUTC(x.date, x.heure) > Date.now()) return J({ error: "Cette séance n'a pas encore eu lieu." }, 400);
      /* Pointage : un statut par participant·e — present, retard (+ minutes), excuse (absent·e excusé·e), absent. « presents » (présent·es et en retard) est conservé pour le décompte des heures. */
      const parts = x.participants || [], statuts = {};
      if (b.statuts && typeof b.statuts === "object") {
        for (const n of parts) {
          const v = b.statuts[n] || {}, s = STATUTS_PRES.includes(v.s) ? v.s : "absent", e = { s };
          if (s === "retard") { const m = Math.round(Number(v.min)); e.min = Number.isFinite(m) && m >= 1 && m <= 180 ? m : 5; }
          const note = clean(v.note, 200).trim(); if (note && s !== "present") e.note = note;
          statuts[n] = e;
        }
      } else { const p = Array.isArray(b.presents) ? b.presents : []; for (const n of parts) statuts[n] = { s: p.includes(n) ? "present" : "absent" }; }
      x.statuts = statuts; x.presents = parts.filter((n) => statuts[n].s === "present" || statuts[n].s === "retard");
      if ("notes" in b) x.notes = clean(b.notes, 600); x.fait = true; x.maj = new Date().toISOString(); x.pointePar = user; x.pointeLe = x.maj;
      await ss.setJSON(x.id, x); return J({ ok: true, item: masque(x) });
    }
    // sup_save
    const roles = await rolesMap();
    const date = String(b.date || ""), heure = String(b.heure || ""), duree = Number(b.duree);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || ![1, 2, 3, 4, 5].includes(weekday(date))) return J({ error: "La supervision a lieu du lundi au vendredi." }, 400);
    if (!HEURES_SUP.includes(heure) || !DUREES.includes(duree)) return J({ error: "Horaire ou durée invalide." }, 400);
    const typeB = ["individuelle", "reunion"].includes(b.type) ? b.type : b.type === "entretien" && admin ? "entretien" : "groupe";
    let superviseur = clean(b.superviseur, 60).trim();
    if (superviseur.toLowerCase() in roles) superviseur = superviseur.toLowerCase();
    if (typeB === "reunion" && !admin) superviseur = user;
    if (typeB === "entretien") superviseur = user;
    if (!superviseur) return J({ error: "Indiquez le nom du ou de la superviseur·e." }, 400);
    const type = typeB;
    const participants = [...new Set((Array.isArray(b.participants) ? b.participants : []).map((n) => String(n).toLowerCase()))].filter((n) => roles[n] && (type === "reunion" || roles[n] !== "superviseur"));
    if (type === "entretien" && (participants.length !== 1 || roles[participants[0]] === "admin")) return J({ error: "Choisissez une seule personne (un·e étudiant·e) pour l'entretien." }, 400);
    if (!admin && !participants.includes(user)) participants.push(user);
    if (!participants.length) return J({ error: "Choisissez au moins une personne." }, 400);
    const titre = type === "entretien" ? "" : clean(b.titre, 80).trim(), lieu = clean(b.lieu, 80).trim();
    const lien = String(b.lien || "").trim().slice(0, 300);
    if (lien && !/^https:\/\/[^\s]+$/i.test(lien)) return J({ error: "Le lien de visio doit commencer par https://." }, 400);
    const motif = type === "entretien" ? (["feedback", "recadrage", "point", "autre"].includes(b.motif) ? b.motif : "autre") : undefined, compteRendu = type === "entretien" ? clean(b.compteRendu, 1500) : undefined;
    const existantes = await toutes();
    const ex = b.id ? existantes.find((y) => y.id === String(b.id)) : null; if (b.id && !ex) return J({ error: "Séance introuvable." }, 404);
    if (ex && !own(ex)) return J({ error: "Vous ne pouvez modifier que vos propres séances." }, 403);
    if (!ex && parisToUTC(date, heure) < Date.now()) return J({ error: "Ce créneau est déjà passé." }, 400);
    const n = ex || type === "entretien" ? 1 : Math.min(26, Math.max(1, Math.floor(Number(b.repeter)) || 1)), serie = ex ? ex.serie : n > 1 ? randomUUID() : "";
    const dates = Array.from({ length: n }, (_, k) => { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 7 * k); return d.toISOString().slice(0, 10); });
    const tous = await chargerTout(store), conflits = [];
    for (const d of dates) {
      const s0 = mn(heure), e0 = s0 + duree;
      for (const y of existantes) if ((!ex || y.id !== ex.id) && y.date === d && mn(y.heure) < e0 && s0 < mn(y.heure) + y.duree) {
        const com = [y.superviseur === superviseur ? cap(superviseur) : null, ...(y.participants || []).filter((p) => participants.includes(p)).map(cap)].filter(Boolean);
        if (com.length) conflits.push(jourLong(d) + " : " + com.join(", ") + " déjà en supervision à " + y.heure);
      }
      for (const x of tous) for (const r of x.rec.rdvs) if (r.date === d && participants.includes(r.therapeute) && mn(r.heure) < e0 && s0 < mn(r.heure) + 60) conflits.push(jourLong(d) + " : " + cap(r.therapeute) + " a un rendez-vous patient à " + r.heure);
    }
    if (conflits.length && !b.forcer) return J({ error: "Chevauchement : " + conflits.slice(0, 4).join(" ; ") + (conflits.length > 4 ? " (+" + (conflits.length - 4) + ")" : ""), alerte: true }, 409);
    const out = [];
    for (const d of dates) {
      const id = ex ? ex.id : randomUUID();
      const rec = { ...(ex || { creeLe: new Date().toISOString(), creePar: user }), id, serie, titre, type, date: d, heure, duree, lieu, lien, superviseur, participants, ...(type === "entretien" ? { motif, compteRendu } : {}), maj: new Date().toISOString() };
      await ss.setJSON(id, rec); out.push(rec);
    }
    return J({ ok: true, items: out });
  }

  if (["liens_list", "lien_add", "lien_upd", "lien_del"].includes(b.action)) {
    const ls = getStore("liens"), cle = "liste", RES = ["site", "instagram", "linkedin", "facebook", "tiktok", "youtube", "x", "mail", "autre"];
    const liste = (await ls.get(cle, { type: "json" })) || [];
    if (b.action === "liens_list") return J({ ok: true, liens: liste });
    if (b.action === "lien_del") {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Lien introuvable." }, 404);
      if (!admin && cur.par !== user) return J({ error: "Seul·e l'auteur·e ou un admin peut supprimer ce lien." }, 403);
      await ls.setJSON(cle, liste.filter((x) => x.id !== cur.id)); return J({ ok: true, liens: liste.filter((x) => x.id !== cur.id) });
    }
    const nom = clean(b.nom, 80).trim(), note = clean(b.note, 200).trim(), reseau = RES.includes(b.reseau) ? b.reseau : "autre", url = String(b.url || "").trim().slice(0, 500);
    if (!nom) return J({ error: "Donnez un nom au lien." }, 400);
    if (!/^(https?:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(url)) return J({ error: "Le lien doit commencer par https:// (ou être une adresse mail précédée de mailto:)." }, 400);
    if (b.action === "lien_upd") {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Lien introuvable." }, 404);
      if (!admin && cur.par !== user) return J({ error: "Seul·e l'auteur·e ou un admin peut modifier ce lien." }, 403);
      Object.assign(cur, { nom, note, reseau, url, maj: new Date().toISOString() });
    } else {
      if (liste.length >= 60) return J({ error: "Trop de liens (60 maximum) : supprimez-en avant d'en ajouter." }, 400);
      liste.push({ id: randomUUID(), nom, note, reseau, url, par: user, le: new Date().toISOString() });
    }
    await ls.setJSON(cle, liste); return J({ ok: true, liens: liste });
  }

  if (["pub_list", "pub_save", "pub_del"].includes(b.action)) {
    const ps = getStore("publis"), cle = "liste", RES = ["site", "instagram", "linkedin", "facebook", "tiktok", "youtube", "x", "mail", "autre"], STS = ["idee", "attente", "programmee", "publiee"];
    const liste = (await ps.get(cle, { type: "json" })) || [];
    if (b.action === "pub_list") return J({ ok: true, publis: liste });
    if (b.action === "pub_del") {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Publication introuvable." }, 404);
      if (!admin && cur.par !== user) return J({ error: "Seul·e l'auteur·e ou un admin peut supprimer cette publication." }, 403);
      const reste = liste.filter((x) => x.id !== cur.id); await ps.setJSON(cle, reste); return J({ ok: true, publis: reste });
    }
    const titre = clean(b.titre, 120).trim(), texte = clean(b.texte, 3000).trim(), reseau = RES.includes(b.reseau) ? b.reseau : "autre", statut = STS.includes(b.statut) ? b.statut : "idee";
    const date = String(b.date || "").trim(), heure = String(b.heure || "").trim(), lien = String(b.lien || "").trim().slice(0, 500);
    if (!titre) return J({ error: "Donnez un titre à la publication." }, 400);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return J({ error: "Date invalide." }, 400);
    if (heure && !/^\d{2}:\d{2}$/.test(heure)) return J({ error: "Heure invalide." }, 400);
    if (statut === "programmee" && !date) return J({ error: "Choisissez une date pour programmer la publication." }, 400);
    if (lien && !/^https?:\/\/[^\s]+$/i.test(lien)) return J({ error: "Le lien de la publication doit commencer par https://." }, 400);
    let visuel = null;
    if (b.visuel && typeof b.visuel === "object") { const v = JSON.stringify(b.visuel); if (v.length > 6000) return J({ error: "Visuel trop volumineux." }, 413); visuel = JSON.parse(v); }
    const now = new Date().toISOString();
    if (b.id) {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Publication introuvable." }, 404);
      if (!admin && cur.par !== user) return J({ error: "Seul·e l'auteur·e ou un admin peut modifier cette publication." }, 403);
      Object.assign(cur, { titre, texte, reseau, statut, date, heure, lien, visuel, maj: now, majPar: user });
    } else {
      if (liste.length >= 300) return J({ error: "Trop de publications (300 maximum) : supprimez les plus anciennes." }, 400);
      liste.push({ id: randomUUID(), titre, texte, reseau, statut, date, heure, lien, visuel, par: user, le: now });
    }
    await ps.setJSON(cle, liste); return J({ ok: true, publis: liste });
  }

  /* Suivi RH : retards et absences hors séances programmées (rendez-vous patient manqué, permanence…), saisis à la main par les admins.
     Les présences aux réunions et supervisions sont dans le store « supervisions » (champ « statuts »). Store « rh » : une clé « ev/<id> » par événement. */
  if (["rh_events", "rh_event_save", "rh_event_delete"].includes(b.action)) {
    if (!admin) return J({ error: "Réservé aux comptes admin." }, 403);
    const rhs = getStore({ name: "rh", consistency: "strong" });
    const lire = async () => { const { blobs } = await rhs.list({ prefix: "ev/" }); return (await Promise.all(blobs.map((x) => rhs.get(x.key, { type: "json" })))).filter(Boolean).sort((a, z) => (z.date + (z.creeLe || "")).localeCompare(a.date + (a.creeLe || ""))); };
    if (b.action === "rh_events") return J({ ok: true, events: await lire() });
    const idOk = (v) => /^[a-f0-9-]{36}$/.test(String(v || ""));
    if (b.action === "rh_event_delete") { if (!idOk(b.id)) return J({ error: "Événement introuvable." }, 404); await rhs.delete("ev/" + b.id); return J({ ok: true }); }
    const roles = await rolesMap(), nom = String(b.nom || "").toLowerCase();
    if (roles[nom] !== "etudiant" || TECH.includes(nom)) return J({ error: "Choisis un·e étudiant·e psy." }, 400);
    const date = String(b.date || ""), auj = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + "T12:00:00Z"))) return J({ error: "Date invalide." }, 400);
    if (date > auj) return J({ error: "Un retard ou une absence se saisit une fois passé : la date ne peut pas être dans le futur." }, 400);
    if (!["retard", "excuse", "absent"].includes(b.type)) return J({ error: "Choisis retard, absence excusée ou absence." }, 400);
    const contexte = ["consultation", "permanence", "autre"].includes(b.contexte) ? b.contexte : "autre", note = clean(b.note, 300).trim();
    const min = b.type === "retard" ? Math.min(180, Math.max(1, Math.round(Number(b.min)) || 5)) : undefined;
    let ex = null; if (b.id) { if (!idOk(b.id)) return J({ error: "Événement introuvable." }, 404); ex = await rhs.get("ev/" + b.id, { type: "json" }); if (!ex) return J({ error: "Événement introuvable." }, 404); }
    const id = ex ? ex.id : randomUUID(), rec = { ...(ex || { creeLe: new Date().toISOString(), creePar: user }), id, nom, date, type: b.type, contexte, note, ...(min ? { min } : { min: undefined }), maj: new Date().toISOString(), par: user };
    await rhs.setJSON("ev/" + id, rec);
    return J({ ok: true, event: rec });
  }

  /* Règlement intérieur : texte modifiable par les admins (Gestion RH > Règlement intérieur), publié puis signé par chacun·e (nom saisi + case cochée).
     Store « reglement » : « brouillon » (texte en cours de rédaction), « cur » (version publiée : numéro, empreinte, date, auteur), « meta » (dernier numéro de version, historique des publications),
     « t/<empreinte> » (texte exact de chaque version publiée, conservé pour retrouver ce qui a été signé), « s/<compte> » (dernière signature + historique). Texte de départ : netlify/lib/reglement.mjs. */
  const rgs = getStore({ name: "reglement", consistency: "strong" });
  const rgCur = async () => (await rgs.get("cur", { type: "json" })) || null;
  const rgTexte = async (h) => (/^[a-f0-9]{32}$/.test(String(h)) ? (await rgs.get("t/" + h, { type: "json" })) || null : null);
  const rgSig = async (n) => (NAME.test(String(n)) ? (await rgs.get("s/" + n, { type: "json" })) || null : null);
  /* texte de travail : brouillon en cours, sinon texte publié, sinon dernier texte publié (après un retrait), sinon texte de départ */
  const rgBase = async (cur, meta) => (await rgs.get("brouillon", { type: "json" })) || (cur ? await rgTexte(cur.hash) : null) || (meta?.dernierHash ? await rgTexte(meta.dernierHash) : null) || REG.DEFAUT;
  const rgVue = (s, cur) => (s ? { version: s.version, le: s.le, nom: s.nom, aJour: !!cur && s.version === cur.version } : null);
  if (["reglement_get", "reglement_sign", "reglement_copie", "reglement_texte", "juridique_get", "reglement_brouillon", "reglement_brouillon_reset", "reglement_pub"].includes(b.action)) {
    const cur = await rgCur();
    if (b.action === "reglement_get") {
      const out = { ok: true, publie: !!cur, moi: admin || sup ? null : rgVue(await rgSig(user), cur) }; // seul·es les étudiant·es psy signent
      let doc = null;
      if (cur) { doc = await rgTexte(cur.hash); Object.assign(out, { version: cur.version, date: cur.le, empreinte: cur.hash }); }
      else if (admin) { doc = await rgBase(cur, (await rgs.get("meta", { type: "json" })) || {}); out.apercu = true; }
      if (doc && b.texte !== false) { out.titre = doc.titre; out.intro = doc.intro; out.articles = doc.articles; }
      return J(out);
    }
    if (b.action === "reglement_sign") {
      if (admin || sup) return J({ error: "Le règlement est signé par les étudiant·es psy : les admins n'ont pas à le signer." }, 403);
      if (!cur) return J({ error: "Le règlement n'est pas encore publié." }, 409);
      if (String(b.version) !== cur.version || String(b.hash) !== cur.hash) return J({ error: "Le règlement vient d'être mis à jour : recharge la page pour lire la dernière version." }, 409);
      const nom = clean(b.nom, 80).replace(/\s+/g, " ").trim();
      if (nom.length < 3) return J({ error: "Écris ton prénom et ton nom pour signer." }, 400);
      if (b.accepte !== true) return J({ error: "Coche la case pour confirmer que tu as lu le règlement et que tu l'acceptes." }, 400);
      const prev = await rgSig(user);
      if (prev && prev.version === cur.version) return J({ ok: true, moi: rgVue(prev, cur) });
      const hist = [...(prev?.hist || []), ...(prev ? [{ version: prev.version, hash: prev.hash, le: prev.le, nom: prev.nom }] : [])].slice(-10);
      const rec = { version: cur.version, hash: cur.hash, nom, le: new Date().toISOString(), hist };
      await rgs.setJSON("s/" + user, rec);
      return J({ ok: true, moi: rgVue(rec, cur) });
    }
    if (b.action === "reglement_copie") { // exemplaire signé : le texte exact signé + les mentions de signature (soi-même, ou n'importe qui pour un·e admin)
      const cible = b.compte ? String(b.compte).toLowerCase() : user;
      if (cible !== user && !admin) return J({ error: "Réservé aux comptes admin." }, 403);
      const sg = await rgSig(cible); if (!sg) return J({ error: "Ce règlement n'a pas encore été signé." }, 404);
      const doc = await rgTexte(sg.hash); if (!doc) return J({ error: "Le texte exact de cette version n'est plus disponible." }, 404);
      return J({ ok: true, compte: cible, titre: doc.titre, intro: doc.intro, articles: doc.articles, sig: { version: sg.version, hash: sg.hash, nom: sg.nom, le: sg.le } });
    }
    if (!admin) return J({ error: "Réservé aux comptes admin." }, 403);
    if (b.action === "reglement_texte") {
      const doc = await rgTexte(b.hash); if (!doc) return J({ error: "Version introuvable." }, 404);
      return J({ ok: true, ...doc, hash: String(b.hash) });
    }
    const meta = (await rgs.get("meta", { type: "json" })) || {};
    if (b.action === "juridique_get") {
      const brouillon = await rgs.get("brouillon", { type: "json" }), publie = cur ? await rgTexte(cur.hash) : null;
      const base = await rgBase(cur, meta), nb = REG.nettoyer(base);
      const roles = await rolesMap();
      const signatures = await Promise.all(Object.keys(roles).filter((n) => roles[n] === "etudiant" && !TECH.includes(n)).sort().map(async (n) => {
        const sg = await rgSig(n);
        return { nom: n, role: roles[n], ...(sg ? { version: sg.version, le: sg.le, signeNom: sg.nom, aJour: !!cur && sg.version === cur.version } : {}) };
      }));
      return J({ ok: true, cur, dernier: meta.dernier || 0, historique: (meta.hist || []).slice(-30).reverse(), source: brouillon ? "brouillon" : publie || meta.dernierHash ? "publie" : "defaut",
        brouillon: brouillon ? { maj: brouillon.maj, par: brouillon.par } : null, modifie: !!cur && REG.empreinte(nb) !== cur.hash, memeQueDernier: !!meta.dernierHash && REG.empreinte(nb) === meta.dernierHash,
        base: { titre: nb.titre, intro: nb.intro, articles: nb.articles }, signatures });
    }
    if (b.action === "reglement_brouillon") {
      const d = REG.nettoyer(b.doc); if (d.error) return J({ error: d.error }, 400);
      const maj = new Date().toISOString(); await rgs.setJSON("brouillon", { ...d, maj, par: user });
      return J({ ok: true, maj, empreinte: REG.empreinte(d) });
    }
    if (b.action === "reglement_brouillon_reset") { await rgs.delete("brouillon"); return J({ ok: true }); }
    // reglement_pub
    if (!b.publie) { await rgs.delete("cur"); return J({ ok: true, publie: false }); }
    const doc = REG.nettoyer(await rgBase(cur, meta));
    if (doc.error) return J({ error: doc.error }, 400);
    if (!doc.articles.length) return J({ error: "Le règlement doit contenir au moins un article." }, 400);
    const h = REG.empreinte(doc), dernier = meta.dernier || 0;
    if (cur && cur.hash === h) return J({ error: "Aucune modification à publier." }, 409);
    let version;
    if (!dernier) version = "1";
    else if (meta.dernierHash === h) version = String(dernier); // même texte qu'avant la dépublication
    else if (b.important === true) version = String(dernier + 1);
    else if (b.important === false) version = String(dernier);
    else return J({ error: "Indique s'il s'agit d'un changement important (nouvelle signature) ou d'une correction mineure." }, 400);
    const now = new Date().toISOString(), rec = { version, hash: h, le: now, par: user };
    await rgs.setJSON("t/" + h, doc); await rgs.setJSON("cur", rec);
    await rgs.setJSON("meta", { dernier: Math.max(dernier, +version), dernierHash: h, hist: [...(meta.hist || []), { version, hash: h, le: now, par: user, important: b.important === true }].slice(-60) });
    await rgs.delete("brouillon");
    return J({ ok: true, publie: true, cur: rec });
  }

  /* Parcours d'accueil des nouvelles recrues : 2 étapes constatées automatiquement (photo, présentation), 4 cochées par la personne.
     Chacun·e ne voit et ne modifie que son parcours ; les admins voient l'avancement de tous les étudiant·es psy. Store « accueil » : une clé par compte. */
  if (["accueil_get", "accueil_set"].includes(b.action)) {
    const as = getStore("accueil"), MANUELS = ["charte", "modeles", "ressources", "equipe"];
    const rcur = await rgCur();
    const etat = async (n) => {
      const pr = (await profils().get(n, { type: "json" })) || {}, m = (await as.get(n, { type: "json" })) || {}, sg = await rgSig(n);
      return { photo: !!pr.photo, bio: !!(pr.bio && String(pr.bio).trim()), reglement: sg && rcur && sg.version === rcur.version ? sg.le : "", ...Object.fromEntries(MANUELS.map((k) => [k, m[k] || ""])) };
    };
    if (b.action === "accueil_set") {
      const k = String(b.step || ""); if (!MANUELS.includes(k)) return J({ error: "Étape inconnue." }, 400);
      const m = (await as.get(user, { type: "json" })) || {};
      if (b.done) m[k] = new Date().toISOString(); else delete m[k];
      await as.setJSON(user, m);
      return J({ ok: true, moi: await etat(user) });
    }
    const out = { ok: true, moi: await etat(user), reg: { publie: !!rcur, version: rcur ? rcur.version : "" } };
    if (admin) {
      const roles = await rolesMap(), noms = Object.keys(roles).filter((n) => roles[n] === "etudiant" && !TECH.includes(n));
      out.equipe = Object.fromEntries(await Promise.all(noms.map(async (n) => [n, { ...(await etat(n)), depuis: NAME.test(n) ? ((await ac.get(n, { type: "json" }))?.creeLe || "") : "" }])));
    }
    return J(out);
  }
  if (["annonce_list", "annonce_save", "annonce_del", "annonce_lu", "annonce_arch"].includes(b.action)) {
    const as = getStore("annonces"), cle = "liste";
    const liste = (await as.get(cle, { type: "json" })) || [];
    const auj = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    const vue = (l) => (admin ? l : l.filter((x) => !x.debut || x.debut <= auj)).map((x) => (admin ? x : { ...x, lus: undefined, lu: (x.lus || []).includes(user) }));
    if (b.action === "annonce_list") return J({ ok: true, annonces: vue(liste) });
    if (b.action === "annonce_lu") {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Annonce introuvable." }, 404);
      cur.lus = cur.lus || []; if (!cur.lus.includes(user)) { cur.lus.push(user); await as.setJSON(cle, liste); }
      return J({ ok: true, annonces: vue(liste) });
    }
    if (!admin) return J({ error: "Réservé aux comptes admin." }, 403);
    if (b.action === "annonce_arch") {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Annonce introuvable." }, 404);
      if (b.archivee) cur.archivee = true; else { cur.archivee = false; cur.jusqua = ""; cur.maj = new Date().toISOString(); }
      await as.setJSON(cle, liste); return J({ ok: true, annonces: liste });
    }
    if (b.action === "annonce_del") { const reste = liste.filter((x) => x.id !== String(b.id)); await as.setJSON(cle, reste); return J({ ok: true, annonces: reste }); }
    const titre = clean(b.titre, 120).trim(), texte = clean(b.texte, 2000).trim(), important = !!b.important, debut = String(b.debut || "").trim(), jusqua = String(b.jusqua || "").trim(), lien = String(b.lien || "").trim().slice(0, 500);
    if (!titre) return J({ error: "Donnez un titre à l'annonce." }, 400);
    if ((jusqua && !/^\d{4}-\d{2}-\d{2}$/.test(jusqua)) || (debut && !/^\d{4}-\d{2}-\d{2}$/.test(debut))) return J({ error: "Date invalide." }, 400);
    if (debut && jusqua && jusqua < debut) return J({ error: "La date de fin est avant la date de début." }, 400);
    if (lien && !/^https?:\/\/[^\s]+$/i.test(lien)) return J({ error: "Le lien doit commencer par https://." }, 400);
    const now = new Date().toISOString();
    if (b.id) {
      const cur = liste.find((x) => x.id === String(b.id)); if (!cur) return J({ error: "Annonce introuvable." }, 404);
      const change = cur.titre !== titre || cur.texte !== texte;
      Object.assign(cur, { titre, texte, important, debut, jusqua, lien, maj: now, archivee: false }); if (change) cur.lus = [];
    } else {
      while (liste.length >= 60) liste.pop();
      liste.unshift({ id: randomUUID(), titre, texte, important, debut, jusqua, lien, par: user, le: now, lus: [] });
    }
    await as.setJSON(cle, liste); return J({ ok: true, annonces: liste });
  }

  if (b.action === "res_get") {
    const rs = getStore("ressources"), m = await rs.get("m/" + String(b.id), { type: "json" });
    if (!m || m.type !== "fichier") return J({ error: "Fichier introuvable." }, 404);
    const buf = await rs.get("f/" + m.id, { type: "arrayBuffer" }); if (!buf) return J({ error: "Fichier introuvable." }, 404);
    return J({ ok: true, nom: m.nom, mime: m.mime, data: Buffer.from(buf).toString("base64") });
  }
  if (["res_add", "res_upd", "res_del"].includes(b.action)) {
    if (!admin) return J({ error: "Réservé aux comptes principaux." }, 403);
    const rs = getStore("ressources");
    if (b.action === "res_del") { const id = String(b.id); await rs.delete("m/" + id); await rs.delete("f/" + id); return J({ ok: true }); }
    const titre = clean(b.titre, 120).trim(), description = clean(b.description, 500).trim(), categorie = CATS.includes(b.categorie) ? b.categorie : CATS[0];
    if (!titre) return J({ error: "Donnez un titre." }, 400);
    if (b.action === "res_upd") {
      const m = await rs.get("m/" + String(b.id), { type: "json" }); if (!m) return J({ error: "Introuvable." }, 404);
      Object.assign(m, { titre, description, categorie }); await rs.setJSON("m/" + m.id, m); return J({ ok: true, item: m });
    }
    const id = randomUUID(), now = new Date().toISOString(); let m;
    if (b.lien) {
      if (!/^https?:\/\/[^\s]+$/i.test(String(b.lien))) return J({ error: "Le lien doit commencer par http:// ou https://." }, 400);
      m = { id, type: "lien", titre, description, categorie, url: String(b.lien).slice(0, 500), par: user, le: now };
    } else {
      const nom = clean(b.nom, 150).replace(/[\\/]/g, "_"), ext = nom.split(".").pop().toLowerCase();
      if (!MIMES[ext]) return J({ error: "Format non accepté (PDF, Word, Excel, PowerPoint, image, texte)." }, 400);
      if (typeof b.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(b.data)) return J({ error: "Fichier invalide." }, 400);
      const buf = Buffer.from(b.data, "base64"); if (!buf.length || buf.length > MAX_FICHIER) return J({ error: "Fichier trop lourd (4 Mo maximum). Pour un fichier plus gros, ajoutez un lien." }, 413);
      await rs.set("f/" + id, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      m = { id, type: "fichier", titre, description, categorie, nom, mime: MIMES[ext], taille: buf.length, par: user, le: now };
    }
    await rs.setJSON("m/" + id, m); return J({ ok: true, item: m });
  }

  if (b.action === "messages_data") {
    const ms = getStore("messages"); const { blobs } = await ms.list({ prefix: "l/" });
    let journal = (await Promise.all(blobs.sort((x, y) => y.key.localeCompare(x.key)).slice(0, 200).map((x) => ms.get(x.key, { type: "json" })))).filter(Boolean);
    if (!admin) journal = journal.filter((j) => j.par === user);
    return J({ ok: true, modeles: Object.values(await chargerModeles()), variables: VARIABLES, journal, mail: mailReady() });
  }
  if (b.action === "modele_save" || b.action === "modele_reset") {
    if (!admin) return J({ error: "Réservé aux comptes principaux." }, 403);
    const id = String(b.id); if (!DEFAUTS[id]) return J({ error: "Modèle inconnu." }, 404);
    const st = getStore("modeles");
    if (b.action === "modele_reset") await st.delete(id);
    else { const objet = clean(b.objet, 200).trim(), corps = clean(b.corps, 4000).trim(); if (id !== "libre" && (!objet || !corps)) return J({ error: "L'objet et le texte ne peuvent pas être vides." }, 400); await st.setJSON(id, { objet, corps }); }
    return J({ ok: true, modeles: Object.values(await chargerModeles()) });
  }
  if (b.action === "message_apercu" || b.action === "message_envoyer") {
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Personne introuvable." }, 404);
    const base = cur.rec, r = vue(base, base.rdvs[0]), m = (await chargerModeles())[String(b.modele)]; if (!m) return J({ error: "Modèle inconnu." }, 404);
    const v = variables(r);
    if (b.action === "message_apercu") return J({ ok: true, objet: rendre(m.objet, v), corps: rendre(m.corps, v), manquants: [...new Set([...manquants(m.objet, v), ...manquants(m.corps, v)])], email: r.email });
    const objet = clean(b.objet, 200).trim(), corps = clean(b.corps, 4000).trim();
    if (!objet || !corps) return J({ error: "L'objet et le message sont obligatoires." }, 400);
    const mail = await mailMsg(async () => envoyer(r, { subject: objet, text: corps }, null, { modele: m.id, par: user, type: "manuel" }));
    if (mail === "envoye") { base.maj = new Date().toISOString(); base.majPar = user; if (base.statut === "nouvelle") base.statut = "contactee"; await store.setJSON(cur.key, base); }
    return J({ ok: mail === "envoye", mail, item: base, error: mail === "envoye" ? undefined : mail === "non_configure" ? "L'envoi de mails n'est pas encore configuré." : "Le mail n'a pas pu partir." });
  }

  /* Fiches de prévention pour les patients : fiches de base (texte : netlify/lib/fiches.mjs) + fiches créées sur le site par les admins (store « fiches », une clé f/<id> par fiche).
     Lecture / impression côté page, envoi par mail ici. */
  const fis = getStore({ name: "fiches", consistency: "strong" });
  const fichesTout = async () => {
    const { blobs } = await fis.list({ prefix: "f/" });
    const perso = (await Promise.all(blobs.map((x) => fis.get(x.key, { type: "json" })))).filter(Boolean).sort((p, q) => String(q.maj).localeCompare(String(p.maj))).map((f) => ({ ...f, perso: true }));
    return [...perso, ...FI.FICHES].map((f) => ({ ...f, sections: FI.sections(f) }));
  };
  if (b.action === "fiches_list") return J({ ok: true, fiches: await fichesTout(), urgences: FI.URGENCES, soutiens: FI.SOUTIENS, avertissement: FI.AVERTISSEMENT, contact: FI.CONTACT, version: FI.VERSION, icones: FI.ICONES, aideDefaut: FI.AIDE_DEFAUT, mail: mailReady() });
  if (b.action === "fiche_save" || b.action === "fiche_delete") {
    if (!admin) return J({ error: "Réservé aux comptes admin." }, 403);
    if (b.action === "fiche_delete") {
      const id = String(b.id || ""); if (!/^u-[a-z0-9]{6,12}$/.test(id) || !(await fis.get("f/" + id, { type: "json" }))) return J({ error: "Fiche introuvable." }, 404);
      await fis.delete("f/" + id); return J({ ok: true });
    }
    const r = FI.nettoyerFiche(b.fiche); if (r.error) return J({ error: r.error }, 400);
    let id = String(b.fiche?.id || "");
    if (id) { if (!/^u-[a-z0-9]{6,12}$/.test(id) || !(await fis.get("f/" + id, { type: "json" }))) return J({ error: "Fiche introuvable." }, 404); }
    else id = "u-" + Math.random().toString(36).slice(2, 9).padEnd(7, "0");
    const prev = await fis.get("f/" + id, { type: "json" }), now = new Date().toISOString();
    const rec = { id, ...r.fiche, creeLe: prev?.creeLe || now, creePar: prev?.creePar || user, maj: now, par: user };
    await fis.setJSON("f/" + id, rec);
    return J({ ok: true, fiche: { ...rec, perso: true } });
  }
  if (b.action === "fiche_envoyer") {
    const f = (await fichesTout()).find((x) => x.id === String(b.fiche)); if (!f) return J({ error: "Fiche introuvable." }, 404);
    const cur = (await chargerTout(store)).find((x) => x.rec.id === String(b.id)); if (!cur) return J({ error: "Personne introuvable." }, 404);
    const r = vue(cur.rec, cur.rec.rdvs[0]), c = FI.courrier(f, { prenom: r.prenom, note: clean(b.note, 600) });
    const mail = await mailMsg(async () => envoyer(r, { subject: c.objet, text: c.text, html: c.html }, null, { modele: "Fiche · " + f.titre, par: user, type: "manuel" }));
    return J({ ok: mail === "envoye", mail, prenom: r.prenom, error: mail === "envoye" ? undefined : mail === "non_configure" ? "L'envoi de mails n'est pas encore configuré." : "Le mail n'a pas pu partir." });
  }

  if (b.action === "update") {
    const k = await key(String(b.id)); if (!k) return J({ error: "Demande introuvable." }, 404);
    const r = norm(await store.get(k, { type: "json" })); const p = b.patch || {};
    if ("statut" in p && STATUTS.includes(p.statut)) {
      if (p.statut === "attente" && r.statut !== "attente" && r.rdvs.length) return J({ error: "Cette personne a déjà un rendez-vous : annulez-le avant de la mettre en liste d'attente." }, 409);
      r.statut = p.statut;
    }
    if (r.statut === "attente") r.attenteLe ||= new Date().toISOString(); else delete r.attenteLe;
    if ("assigne" in p) r.assigne = clean(p.assigne, 40);
    if ("notes" in p) r.notes = clean(p.notes, 1000);
    if (p.retoursVus === true && Array.isArray(r.retours)) for (const x of r.retours) x.vu = true;
    if ("prenom" in p && clean(p.prenom, 60).trim()) r.prenom = clean(p.prenom, 60).trim();
    if ("tel" in p) r.tel = clean(p.tel, 25).trim();
    if ("email" in p && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(p.email, 120).trim())) r.email = clean(p.email, 120).trim().toLowerCase();
    r.maj = new Date().toISOString(); r.majPar = user;
    await store.setJSON(k, r);
    return J({ ok: true, item: r });
  }
  if (b.action === "delete") {
    const k = await key(String(b.id)); if (!k) return J({ error: "Demande introuvable." }, 404);
    await store.delete(k); return J({ ok: true });
  }
  return J({ error: "Action inconnue" }, 400);
};

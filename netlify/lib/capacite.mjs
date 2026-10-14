// Capacité d'accueil et liste d'attente.
// Une « place » = une personne suivie en même temps par un·e étudiant·e. Chaque étudiant·e a un maximum (valeur par défaut
// réglable, avec exceptions par personne). Rien ne change tant que les admins n'ont pas activé la limite (réglage « actif »).
import { getStore } from "@netlify/blobs";

export const DEFAUT_MAX = 4;
const TECH = ["violette"]; // même liste que gestion.mjs : le service technique ne suit pas de patient·es
const cfgStore = () => getStore({ name: "config", consistency: "strong" });

// Occupe une place : rendez-vous fixé, suivi en cours, ou séance à replanifier après au moins une séance réalisée.
// Ne comptent pas : nouvelles demandes, liste d'attente, personnes seulement contactées, suivis terminés ou sans suite.
export const enSuivi = (r) => r.statut === "rdv_fixe" || r.statut === "en_cours" || (r.statut === "a_recontacter" && (r.seances || []).some((s) => s.issue === "realisee"));

export async function chargerCfg() {
  const o = await cfgStore().get("capacite", { type: "json" }), ok = (v) => Number.isInteger(v) && v >= 1 && v <= 20;
  const parEtudiant = {};
  for (const [k, v] of Object.entries(o?.parEtudiant || {})) if (ok(v)) parEtudiant[k] = v;
  return { actif: !!o?.actif, defaut: ok(o?.defaut) ? o.defaut : DEFAUT_MAX, parEtudiant, maj: o?.maj || "", par: o?.par || "" };
}
export async function enregistrerCfg(cfg, par) {
  const st = cfgStore();
  await st.setJSON("capacite", { actif: !!cfg.actif, defaut: cfg.defaut, parEtudiant: cfg.parEtudiant, maj: new Date().toISOString(), par });
  await st.delete("resume"); // le résumé du site public se recalcule avec les nouveaux réglages
}

// Comptes « Étudiant·e psy » actifs (les admins, le service technique et les comptes désactivés n'ont pas de places).
export async function etudiants() {
  const ac = getStore("comptes"), rls = getStore("roles"), out = new Set();
  const principaux = (process.env.GESTION_COMPTES || "").split(",").map((s) => s.split(":")[0].trim().toLowerCase()).filter(Boolean);
  for (const n of principaux) { if (TECH.includes(n)) continue; const v = await rls.get(n, { type: "json" }); if (v?.role === "etudiant") out.add(n); }
  const { blobs } = await ac.list();
  for (const x of blobs) {
    if (TECH.includes(x.key)) continue;
    const v = await ac.get(x.key, { type: "json" }); if (!v || v.role === "superviseur") continue;
    if ((["admin", "etudiant"].includes(v.role) ? v.role : "etudiant") === "etudiant") out.add(x.key);
  }
  return [...out].sort();
}

export function calcul(items, etu, cfg) {
  const parEtudiant = {}; let capacite = 0, occupees = 0, libres = 0;
  for (const n of etu) {
    const max = cfg.parEtudiant[n] || cfg.defaut, k = items.filter((r) => enSuivi(r) && r.assigne === n).length;
    parEtudiant[n] = { n: k, max, perso: n in cfg.parEtudiant };
    capacite += max; occupees += k; libres += Math.max(0, max - k);
  }
  const attente = items.filter((r) => r.statut === "attente").length;
  return { actif: cfg.actif, defaut: cfg.defaut, parEtudiant, capacite, occupees, libres, attente, complet: cfg.actif && capacite > 0 && libres === 0 };
}

// Résumé pour le formulaire public, recalculé au plus toutes les 10 minutes (il lit toutes les demandes).
export async function resumePublic() {
  const cfg = await chargerCfg(); if (!cfg.actif) return { complet: false };
  const st = cfgStore(), c = await st.get("resume", { type: "json" });
  if (c && Date.now() - c.le < 10 * 60e3) return { complet: !!c.complet };
  const ds = getStore("demandes"), { blobs } = await ds.list({ prefix: "d/" });
  const items = (await Promise.all(blobs.map((x) => ds.get(x.key, { type: "json" })))).filter(Boolean);
  const r = calcul(items, await etudiants(), cfg);
  await st.setJSON("resume", { le: Date.now(), complet: r.complet });
  return { complet: r.complet };
}

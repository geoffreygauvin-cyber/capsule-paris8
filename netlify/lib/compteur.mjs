// Nombre de demandes reçues par mois, pour voir l'évolution du dispositif.
// Les fiches se suppriment (RGPD) : si l'on comptait les fiches existantes, l'historique baisserait au fil des suppressions.
// On garde donc, par mois, un simple nombre (aucune donnée personnelle, aucun lien avec une fiche), complété à partir des
// fiches existantes la première fois : le compteur d'un mois n'est jamais inférieur au nombre de fiches de ce mois.
import { getStore } from "@netlify/blobs";

const cfg = () => getStore({ name: "config", consistency: "strong" });
const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" });
export const moisDe = (d) => { const p = Object.fromEntries(FMT.formatToParts(d).map((x) => [x.type, x.value])); return `${p.year}-${p.month}`; };
const valide = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(k) && Number.isInteger(v) && v >= 0));

// Fiches existantes par mois : la date de création est dans la clé (d/<date ISO>_<id>), inutile de lire les fiches.
async function fichesParMois() {
  const { blobs } = await getStore("demandes").list({ prefix: "d/" }), o = {};
  for (const b of blobs) {
    const t = new Date(b.key.slice(2, b.key.indexOf("_"))); if (isNaN(t)) continue;
    const m = moisDe(t); o[m] = (o[m] || 0) + 1;
  }
  return o;
}

// À appeler après l'enregistrement d'une nouvelle demande. Un échec ne doit jamais empêcher la demande d'aboutir.
export async function noter(iso) {
  try {
    const st = cfg(), c = valide(await st.get("demandes_mois", { type: "json" })), m = moisDe(new Date(iso));
    c[m] = Math.max((c[m] || 0) + 1, (await fichesParMois())[m] || 0);
    await st.setJSON("demandes_mois", c);
  } catch (e) { console.error("compteur demandes", e.message); }
}

// Historique complet, trié ; enregistre au passage les mois dont les fiches dépassent le compteur (première utilisation).
export async function parMois() {
  const st = cfg(), c = valide(await st.get("demandes_mois", { type: "json" })), f = await fichesParMois();
  let change = false;
  for (const [m, n] of Object.entries(f)) if ((c[m] || 0) < n) { c[m] = n; change = true; }
  if (change) await st.setJSON("demandes_mois", c);
  return { mois: Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b))), courant: moisDe(new Date()) };
}

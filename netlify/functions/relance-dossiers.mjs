import * as IV from "../lib/interv.mjs";
import { envoyer, mailReady } from "../lib/mail.mjs";

// Chaque lundi à 7 h UTC (8 h ou 9 h à Paris) : relance par mail des intervenant·es dont le dossier est incomplet
// (« sans pièces en ligne, pas de paiement »). Désactivable et réglable (7 ou 14 jours) dans Gestion RH › Intervenant·es.
export const config = { schedule: "0 7 * * 1" };

export default async () => {
  if (!mailReady()) return;
  const cfg = await IV.cfgRelance(); if (!cfg.actif) return;
  const pieces = await IV.chargerPieces(), seuil = Date.now() - (cfg.jours - 1) * 864e5, trois = Date.now() - 3 * 864e5;
  for (const r of await IV.lister()) {
    if (!IV.aRelancer(r, pieces)) continue;
    const dernier = Math.max(...[r.relance?.dernier, r.envoye].map((d) => (d ? Date.parse(d) : 0)), 0);
    if (dernier ? dernier > seuil : Date.parse(r.creeLe) > trois) continue; // déjà contacté·e récemment, ou ajouté·e il y a moins de 3 jours
    try { await IV.relancer(r, pieces, envoyer, "système", "auto"); } catch (e) { console.error("relance dossier échouée", r.id, e.message); }
  }
};

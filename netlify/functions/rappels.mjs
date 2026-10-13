import { getStore } from "@netlify/blobs";
import { envoyer, mailReady } from "../lib/mail.mjs";
import { chargerTout, tomorrowParis } from "../lib/rdv.mjs";
import { texte } from "../lib/modeles.mjs";

// Tous les jours à 16 h UTC (17 h ou 18 h à Paris) : rappel aux personnes dont le rendez-vous est demain.
export const config = { schedule: "0 16 * * *" };

export default async () => {
  if (!mailReady()) return;
  const store = getStore("demandes"), demain = tomorrowParis();
  for (const { key, rec } of await chargerTout(store)) {
    if (rec.statut !== "rdv_fixe" || rec.rdvDate !== demain || rec.rappelEnvoye || !rec.email) continue;
    try { await envoyer(rec, await texte("rappel", rec), "REQUEST", { modele: "rappel", par: "système", type: "auto" }); rec.rappelEnvoye = true; rec.maj = new Date().toISOString(); await store.setJSON(key, rec); }
    catch (e) { console.error("rappel échoué", rec.id, e.message); }
  }
};

// Clôture d'année : on archive les données des comptes étudiant·es et superviseur·es, puis on supprime ces comptes
// et ce qui s'y rattache, pour que la plateforme reparte à zéro. Les admins, le compte Services techniques, les
// ressources, la charte, les fiches, les annonces, le budget et le texte du règlement ne sont jamais touchés.
//
// Ce qui est conservé dans l'archive (store Blobs « archives », clé « a/<année> », lisible par les admins seulement) :
//   - une fiche par personne (profil sans photo, mail, parcours d'accueil, règlement signé, heures de consultation, séances,
//     présences, retards, absences, heures de supervision, fiche et pièces d'intervenant·e pour les superviseur·es) ;
//   - les patient·es dont le suivi est terminé, ANONYMISÉS (ni nom, ni mail, ni téléphone, ni notes : seulement dates de séances,
//     issues, scores de bien-être et de satisfaction, changement perçu) ;
//   - les supervisions, réunions et entretiens de l'année, et les retards et absences saisis à la main.
// Ce qui reste dans la plateforme : la liste d'attente, les demandes non traitées et les suivis en cours (sans thérapeute,
// à réaffecter ; les rendez-vous à venir avec un·e étudiant·e supprimé·e sont annulés).
// Ce qui est supprimé sans archive : les discussions internes des comptes supprimés, le journal des mails aux patient·es,
// les codes, photos, liens d'agenda. Les pièces d'intervenant·es (RIB, pièce d'identité…) sont déplacées dans l'archive.
import { getStore } from "@netlify/blobs";
import * as IV from "./interv.mjs";
import { norm } from "./rdv.mjs";

export const ANNEE = /^\d{4}-\d{4}$/;
const arc = () => getStore({ name: "archives", consistency: "strong" });
const FINI = ["terminee", "sans_suite"];
const sans = (o, ks) => { const c = { ...(o || {}) }; for (const k of ks) delete c[k]; return c; };
const cles = async (st, prefix) => (await st.list(prefix ? { prefix } : {})).blobs.map((b) => b.key);
const jsons = async (st, prefix) => (await Promise.all((await cles(st, prefix)).map(async (k) => { const v = await st.get(k, { type: "json" }); return v ? [k, v] : null; }))).filter(Boolean);
// traite par lots de 12 en parallèle (les fonctions Netlify s'arrêtent après quelques secondes)
const lot = async (liste, fn, n = 12) => { for (let i = 0; i < liste.length; i += n) await Promise.all(liste.slice(i, i + n).map(fn)); };
const h = (min) => Math.round((min / 60) * 100) / 100;

// Rassemble tout ce qui concerne l'année. Ne modifie rien.
export async function collecter({ ac, profils, principaux, TECH, alias, forcees }) {
  const comptes = [];
  for (const [k, v] of await jsons(ac)) {
    if (TECH.includes(k) || principaux.includes(k) || v.role === "admin") continue;
    comptes.push({ nom: k, statut: v.role === "superviseur" ? "superviseur" : "etudiant", rec: v });
  }
  const noms = new Set(comptes.map((c) => c.nom).concat(forcees || []));
  const dem = getStore("demandes"), sup = getStore("supervisions"), rh = getStore({ name: "rh", consistency: "strong" });
  const rg = getStore({ name: "reglement", consistency: "strong" }), acc = getStore("accueil"), em = getStore("emails");
  const msg = getStore({ name: "messagerie", consistency: "strong" }), jr = getStore("messages");
  const patients = (await jsons(dem, "d/")).map(([k, v]) => ({ k, rec: norm(v) }));
  const supervisions = (await jsons(sup)).map((x) => x[1]).sort((a, z) => (a.date + a.heure).localeCompare(z.date + z.heure));
  const evenements = (await jsons(rh, "ev/")).map((x) => x[1]);
  const intervenants = await IV.lister();
  const convs = (await jsons(msg, "c/")).map((x) => x[1]).filter((c) => (c.membres || []).some((m) => noms.has(m)));
  const journal = await cles(jr, "l/");
  const personnes = [];
  for (const c of comptes) {
    const n = c.nom;
    const seances = patients.flatMap((p) => (p.rec.seances || []).filter((s) => s.therapeute === n));
    const mesSup = supervisions.filter((x) => (x.participants || []).includes(n));
    const aSup = mesSup.filter((x) => x.type !== "reunion" && x.type !== "entretien");
    const pres = (x) => (x.statuts && x.statuts[n]) ? x.statuts[n].s : (x.presents || []).includes(n) ? "present" : null;
    const evs = evenements.filter((e) => String(e.nom || "").toLowerCase() === n);
    const iv = intervenants.find((r) => r.compte === n) || null;
    personnes.push({
      nom: n, affiche: alias[n] || "", statut: c.statut, creeLe: c.rec.creeLe || "", creePar: c.rec.creePar || "",
      profil: sans(await profils.get(n, { type: "json" }), ["photo"]),
      email: (await em.get(n, { type: "json" }))?.email || "",
      accueil: (await acc.get(n, { type: "json" })) || {},
      reglement: (await rg.get("s/" + n, { type: "json" })) || null,
      consultation: {
        seances: seances.filter((s) => s.issue === "realisee").length, absences: seances.filter((s) => s.issue === "absence").length,
        heures: seances.filter((s) => s.issue === "realisee").length,
        patients: new Set(patients.filter((p) => (p.rec.seances || []).some((s) => s.therapeute === n)).map((p) => p.rec.id)).size
      },
      supervision: {
        seances: aSup.length, heures: h(aSup.filter((x) => ["present", "retard"].includes(pres(x))).reduce((t, x) => t + (x.duree || 60), 0)),
        presences: mesSup.filter((x) => pres(x) === "present").length, retards: mesSup.filter((x) => pres(x) === "retard").length,
        excuses: mesSup.filter((x) => pres(x) === "excuse").length, absences: mesSup.filter((x) => pres(x) === "absent").length
      },
      horsSeance: evs.length,
      intervenant: iv ? { id: iv.id, nom: iv.nom, fonction: iv.fonction, email: iv.email, tarif: iv.tarif, valide: iv.valide || null, docs: iv.docs || {} } : null
    });
  }
  const orphelins = intervenants.filter((r) => !comptes.some((c) => c.nom === r.compte));
  return { comptes, noms, patients, supervisions, evenements, intervenants, orphelins, convs, journal, personnes };
}

const termines = (d) => d.patients.filter((p) => FINI.includes(p.rec.statut));
const gardes = (d) => d.patients.filter((p) => !FINI.includes(p.rec.statut));

export async function apercu(env) {
  const d = await collecter(env);
  return {
    ok: true,
    comptes: d.comptes.map((c) => ({ nom: c.nom, affiche: env.alias[c.nom] || "", statut: c.statut })),
    patientsTermines: termines(d).length,
    patientsGardes: gardes(d).length,
    rdvAnnules: gardes(d).reduce((n, p) => n + (p.rec.rdvs || []).filter((r) => d.noms.has(r.therapeute)).length, 0),
    supervisions: d.supervisions.length, evenements: d.evenements.length, discussions: d.convs.length, journalMails: d.journal.length,
    intervenants: d.intervenants.length, pieces: d.intervenants.reduce((n, r) => n + Object.keys(r.docs || {}).length, 0)
  };
}

// Sauvegarde complète (données nominatives) à télécharger avant la clôture. Sans les fichiers des pièces ni le texte des discussions.
export async function sauvegarde(env) {
  const d = await collecter(env);
  return {
    type: "sauvegarde-capsule", creeLe: new Date().toISOString(),
    note: "Contient des données nominatives (patient·es, mails, RIB…) : à ranger en lieu sûr et à détruire une fois la clôture vérifiée. Les fichiers des pièces d'intervenant·es sont archivés dans la plateforme ; le texte des discussions n'est pas sauvegardé.",
    comptes: d.comptes.map((c) => ({ nom: c.nom, statut: c.statut, creeLe: c.rec.creeLe, creePar: c.rec.creePar })),
    personnes: d.personnes, patients: d.patients.map((p) => p.rec), supervisions: d.supervisions, evenements: d.evenements, intervenants: d.intervenants
  };
}

const anonyme = (p, i) => ({
  ref: "P" + String(i + 1).padStart(3, "0"), creeMois: String(p.rec.creeLe || "").slice(0, 7), statut: p.rec.statut, source: p.rec.source || "",
  seances: (p.rec.seances || []).map((s) => ({ date: s.date, therapeute: s.therapeute || "", issue: s.issue, ...(s.bienEtre !== undefined ? { bienEtre: s.bienEtre } : {}), ...(s.satisfaction !== undefined ? { satisfaction: s.satisfaction } : {}) })),
  ...(p.rec.changement?.v ? { changement: p.rec.changement.v } : {})
});

export async function liste() {
  const st = arc(), out = [];
  for (const [k, v] of await jsons(st, "a/")) out.push({ annee: v.annee, creeLe: v.creeLe, par: v.par, termine: v.termine !== false, personnes: (v.personnes || []).length, patients: (v.patients || []).length, supervisions: (v.supervisions || []).length, cle: k });
  return out.sort((a, z) => String(z.annee).localeCompare(String(a.annee)));
}
export async function lire(annee) { return ANNEE.test(String(annee)) ? (await arc().get("a/" + annee, { type: "json" })) || null : null; }
export async function piece(annee, id, pid) {
  if (!ANNEE.test(String(annee)) || !/^[a-f0-9-]{36}$/.test(String(id)) || !/^[a-z0-9_-]{1,40}$/.test(String(pid))) return null;
  const buf = await arc().get(`p/${annee}/${id}/${pid}`, { type: "arrayBuffer" });
  return buf ? Buffer.from(buf) : null;
}

// Archive puis supprime. Renvoie le résumé de ce qui a été fait (et les éventuelles erreurs d'étape).
// L'archive est écrite d'abord, marquée « termine: false ». Si le nettoyage est interrompu (délai d'une fonction Netlify, erreur),
// relancer la clôture avec la même année la reprend là où elle s'est arrêtée (les comptes visés sont mémorisés dans l'archive).
export async function cloturer(env, { annee, par }) {
  if (!ANNEE.test(String(annee))) return { error: "Année invalide : écrivez par exemple 2026-2027." };
  const st = arc(), exist = await st.get("a/" + annee, { type: "json" });
  if (exist && exist.termine !== false) return { error: "Une archive « " + annee + " » existe déjà : choisissez une autre année." };
  const reprise = !!exist;
  const d = await collecter({ ...env, forcees: reprise ? exist.cibles || [] : [] });
  const fin = termines(d), rest = gardes(d);
  let doc = exist, piecesCopiees = exist?.piecesArchivees || 0;

  // 1. archive (sauf en reprise : elle existe déjà)
  if (!reprise) {
    if (!d.comptes.length && !fin.length && !d.supervisions.length && !d.evenements.length && !d.intervenants.length) return { error: "Rien à archiver : aucun compte étudiant·e ou superviseur·e, ni suivi terminé." };
    const { pc } = IV.stores();
    for (const r of d.intervenants) for (const pid of Object.keys(r.docs || {})) {
      const buf = await pc.get(r.id + "/" + pid, { type: "arrayBuffer" });
      if (buf) { await st.set(`p/${annee}/${r.id}/${pid}`, Buffer.from(buf), { metadata: { mime: r.docs[pid].mime || "" } }); piecesCopiees++; }
    }
    doc = {
      annee, creeLe: new Date().toISOString(), par, version: 1, termine: false, cibles: d.comptes.map((c) => c.nom), piecesArchivees: piecesCopiees,
      personnes: d.personnes,
      patients: fin.map(anonyme),
      supervisions: d.supervisions, horsSeance: d.evenements,
      intervenantsSansCompte: d.orphelins.map((r) => ({ id: r.id, nom: r.nom, fonction: r.fonction, email: r.email, tarif: r.tarif, valide: r.valide || null, docs: r.docs || {} })),
      chiffres: { comptes: d.comptes.length, patientsTermines: fin.length, patientsConserves: rest.length, supervisions: d.supervisions.length, discussionsSupprimees: d.convs.length, mailsJournal: d.journal.length }
    };
    await st.setJSON("a/" + annee, doc);
    const relu = await st.get("a/" + annee, { type: "json" });
    if (!relu || (relu.personnes || []).length !== d.personnes.length) return { error: "L'archive n'a pas pu être relue : rien n'a été supprimé." };
  }

  // 2. suppression (chaque étape est protégée : une erreur est notée mais n'arrête pas les autres)
  const faits = { comptes: 0, patientsAnonymises: 0, patientsMisAJour: 0, supervisions: 0, evenements: 0, discussions: 0, intervenants: 0 }, erreurs = [];
  const etape = async (nom, fn) => { try { await fn(); } catch (e) { console.error("cloture", nom, e); erreurs.push(nom); } };
  const dem = getStore("demandes"), { pc, iv } = IV.stores();
  await etape("patients terminés", () => lot(fin, async (p) => { await dem.delete(p.k); faits.patientsAnonymises++; }));
  await etape("patients conservés", () => lot(rest, async (p) => {
    const r = p.rec, avant = JSON.stringify([r.assigne, r.rdvs, r.statut]);
    if (d.noms.has(r.assigne)) r.assigne = "";
    r.rdvs = r.rdvs.filter((x) => !d.noms.has(x.therapeute));
    if (r.statut === "rdv_fixe" && !r.rdvs.length) r.statut = "a_recontacter";
    if (JSON.stringify([r.assigne, r.rdvs, r.statut]) !== avant) { r.maj = new Date().toISOString(); r.majPar = par; await dem.setJSON(p.k, r); faits.patientsMisAJour++; }
  }));
  const sup = getStore("supervisions"); await etape("supervisions", () => lot(d.supervisions, async (x) => { await sup.delete(x.id); faits.supervisions++; }));
  const rh = getStore({ name: "rh", consistency: "strong" });
  await etape("retards et absences", async () => { const ks = await cles(rh, "ev/"); await lot(ks, async (k) => { await rh.delete(k); faits.evenements++; }); });
  const msg = getStore({ name: "messagerie", consistency: "strong" });
  await etape("discussions", async () => {
    await lot(d.convs, async (c) => { const ks = await cles(msg, "m/" + c.id + "/"); await lot(ks, (k) => msg.delete(k)); await msg.delete("c/" + c.id); faits.discussions++; });
    await lot([...d.noms], (n) => msg.delete("r/" + n));
  });
  const jr = getStore("messages"); await etape("journal des mails", () => lot(d.journal, (k) => jr.delete(k)));
  await etape("annonces", async () => {
    const as = getStore("annonces"), l = await as.get("liste", { type: "json" });
    if (Array.isArray(l)) { for (const a of l) if (Array.isArray(a.lus)) a.lus = a.lus.filter((n) => !d.noms.has(n)); await as.setJSON("liste", l); }
  });
  await etape("intervenants", () => lot(d.intervenants, async (r) => { await lot(Object.keys(r.docs || {}), (pid) => pc.delete(r.id + "/" + pid)); await iv.delete("i/" + r.id); faits.intervenants++; }));
  await etape("alias", async () => { const cf = getStore("config"), al = (await cf.get("alias", { type: "json" })) || {}; let m = false; for (const n of d.noms) if (n in al) { delete al[n]; m = true; } if (m) await cf.setJSON("alias", al); });
  const rg = getStore({ name: "reglement", consistency: "strong" }), acc = getStore("accueil"), em = getStore("emails"), co = getStore("codes");
  await lot([...d.noms], (n) => etape("compte " + n, async () => {
    const present = await env.ac.get(n, { type: "json" });
    await env.ac.delete(n); await env.profils.delete(n); await acc.delete(n); await em.delete(n); await co.delete(n); await rg.delete("s/" + n);
    if (env.revoquer) await env.revoquer(n).catch(() => {});
    if (present) faits.comptes++;
  }));
  if (!erreurs.length) { doc.termine = true; delete doc.cibles; await st.setJSON("a/" + annee, doc); }
  return { ok: true, annee, faits, erreurs, piecesArchivees: piecesCopiees, reprise, termine: !erreurs.length };
}

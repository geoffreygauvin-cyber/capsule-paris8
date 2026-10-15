// Budget (admins) : enveloppes par poste, financements, gratifications des stagiaires, journal des dépenses avec justificatif.
// Store « budget » : cfg (réglages), s/<id> (stagiaires), e/<date>_<id> (dépenses), j/<id> (justificatif d'une dépense).
// Les honoraires de supervision ne sont pas saisis : le client les calcule (heures de supervision programmées × tarif horaire) ; seuls les règlements sont des dépenses.
import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

export const MAX_JUST = 4 * 1024 * 1024;
const EXT = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
export const POSTES_DEFAUT = [
  { id: "supervision", label: "Supervision", prevu: 0 },
  { id: "stagiaires", label: "Stagiaires (gratifications)", prevu: 0 },
  { id: "communication", label: "Communication", prevu: 0 },
  { id: "materiel", label: "Matériel et locaux", prevu: 0 },
  { id: "autres", label: "Autres dépenses", prevu: 0 },
];
const SYS = ["supervision", "stagiaires"]; // postes reliés aux calculs automatiques : ils ne peuvent pas être retirés
const clean = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, n);
const euros = (v) => { const n = Math.round(Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")) * 100) / 100; return Number.isFinite(n) && Math.abs(n) <= 10000000 ? n : null; };
const MOIS = /^\d{4}-(0[1-9]|1[0-2])$/, JOUR = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const st = () => getStore({ name: "budget", consistency: "strong" });

export function cfgDefaut() {
  const d = new Date(), y = d.getUTCMonth() >= 8 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return { debut: `${y}-09`, fin: `${y + 1}-08`, postes: POSTES_DEFAUT, financements: [], tarifs: {} };
}
async function etat() {
  const s = st(), cfg = (await s.get("cfg", { type: "json" })) || cfgDefaut();
  const [ls, le] = await Promise.all([s.list({ prefix: "s/" }), s.list({ prefix: "e/" })]);
  const stagiaires = (await Promise.all(ls.blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean).sort((a, z) => String(a.debut).localeCompare(z.debut));
  const depenses = (await Promise.all(le.blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean).sort((a, z) => String(z.date).localeCompare(a.date) || String(z.cree).localeCompare(a.cree));
  return { ok: true, cfg, stagiaires, depenses };
}
const err = (m, s = 400) => ({ error: m, _s: s });

// Retourne l'objet de réponse ; _s = code HTTP éventuel.
export async function action(b, user) {
  const s = st(), a = b.action;
  if (a === "budget_get") return etat();
  if (a === "budget_cfg") {
    const c = b.cfg || {}, old = (await s.get("cfg", { type: "json" })) || cfgDefaut();
    if (!MOIS.test(String(c.debut)) || !MOIS.test(String(c.fin)) || c.fin < c.debut) return err("Période du budget invalide (mois de début et de fin).");
    const vus = new Set(), postes = [];
    for (const p of (Array.isArray(c.postes) ? c.postes : []).slice(0, 20)) {
      const label = clean(p.label, 60); if (!label) continue;
      let id = /^[a-z0-9-]{2,30}$/.test(String(p.id || "")) ? String(p.id) : label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "poste";
      while (vus.has(id)) id = id.slice(0, 26) + "-" + randomUUID().slice(0, 3);
      const prevu = euros(p.prevu); if (prevu === null || prevu < 0) return err("Montant prévu invalide pour « " + label + " ».");
      vus.add(id); postes.push({ id, label, prevu });
    }
    for (const id of SYS) if (!vus.has(id)) postes.unshift({ ...POSTES_DEFAUT.find((p) => p.id === id) });
    const financements = [];
    for (const f of (Array.isArray(c.financements) ? c.financements : []).slice(0, 20)) {
      const label = clean(f.label, 80); if (!label) continue;
      const montant = euros(f.montant); if (montant === null || montant < 0) return err("Montant invalide pour le financement « " + label + " ».");
      financements.push({ id: /^[a-z0-9-]{4,40}$/.test(String(f.id || "")) ? String(f.id) : randomUUID().slice(0, 8), label, montant });
    }
    const tarifs = {};
    for (const [k, v] of Object.entries(c.tarifs && typeof c.tarifs === "object" ? c.tarifs : {}).slice(0, 80)) { const t = euros(v); if (t !== null && t >= 0 && clean(k, 80)) tarifs[clean(k, 80).toLowerCase()] = t; }
    await s.setJSON("cfg", { debut: c.debut, fin: c.fin, postes, financements, tarifs, maj: new Date().toISOString(), par: user, ...(old.cree ? { cree: old.cree } : {}) });
    return etat();
  }
  if (a === "budget_stag") {
    const nom = clean(b.nom, 80); if (!nom) return err("Indiquez le nom du ou de la stagiaire.");
    if (!JOUR.test(String(b.debut)) || !JOUR.test(String(b.fin)) || b.fin < b.debut) return err("Dates de stage invalides (début et fin).");
    const mensuel = euros(b.mensuel); if (mensuel === null || mensuel < 0) return err("Montant mensuel invalide.");
    const ex = b.id ? await s.get("s/" + String(b.id), { type: "json" }) : null; if (b.id && !ex) return err("Introuvable.", 404);
    const id = ex?.id || randomUUID();
    await s.setJSON("s/" + id, { id, nom, debut: b.debut, fin: b.fin, mensuel, note: clean(b.note, 200), cree: ex?.cree || new Date().toISOString() });
    return etat();
  }
  if (a === "budget_stag_del") { await s.delete("s/" + String(b.id)); return etat(); }
  if (a === "budget_dep_get") {
    const e = (await etat()).depenses.find((d) => d.id === String(b.id)); if (!e?.just) return err("Justificatif introuvable.", 404);
    const buf = await s.get("j/" + e.id, { type: "arrayBuffer" }); if (!buf) return err("Justificatif introuvable.", 404);
    return { ok: true, nom: e.just.nom, mime: e.just.mime, data: Buffer.from(buf).toString("base64") };
  }
  if (a === "budget_dep_del") {
    const { depenses } = await etat(), e = depenses.find((d) => d.id === String(b.id));
    if (e) { await s.delete("e/" + e.date + "_" + e.id); await s.delete("j/" + e.id); }
    return etat();
  }
  if (a === "budget_dep") {
    const cur = await etat(), ex = b.id ? cur.depenses.find((d) => d.id === String(b.id)) : null; if (b.id && !ex) return err("Introuvable.", 404);
    const libelle = clean(b.libelle, 120); if (!libelle) return err("Indiquez un libellé (ex. « Supervision de septembre, C. Dupont »).");
    if (!JOUR.test(String(b.date))) return err("Date invalide.");
    const poste = cur.cfg.postes.find((p) => p.id === String(b.poste)); if (!poste) return err("Choisissez un poste.");
    const montant = euros(b.montant); if (montant === null || montant === 0) return err("Montant invalide.");
    const rec = { id: ex?.id || randomUUID(), date: b.date, libelle, poste: poste.id, beneficiaire: clean(b.beneficiaire, 80), montant, statut: b.statut === "a_payer" ? "a_payer" : "payee", note: clean(b.note, 300), cree: ex?.cree || new Date().toISOString(), par: ex?.par || user, ...(ex?.just ? { just: ex.just } : {}) };
    if (b.retirerJust && rec.just) { delete rec.just; await s.delete("j/" + rec.id); }
    if (typeof b.data === "string" && b.data) {
      const nom = clean(b.nom, 120).replace(/[\\/]/g, "_") || "justificatif", ext = nom.split(".").pop().toLowerCase();
      if (!EXT[ext]) return err("Justificatif : format non accepté (PDF, image, Word ou Excel).");
      if (!/^[A-Za-z0-9+/=]+$/.test(b.data)) return err("Justificatif invalide.");
      const buf = Buffer.from(b.data, "base64"); if (!buf.length || buf.length > MAX_JUST) return err("Justificatif vide ou trop lourd (4 Mo maximum).");
      await s.set("j/" + rec.id, buf, { metadata: { mime: EXT[ext] } }); rec.just = { nom, mime: EXT[ext], taille: buf.length };
    }
    if (ex && ex.date !== rec.date) await s.delete("e/" + ex.date + "_" + ex.id);
    await s.setJSON("e/" + rec.date + "_" + rec.id, rec);
    return etat();
  }
  return err("Action inconnue.");
}

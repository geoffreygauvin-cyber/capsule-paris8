import { getStore } from "@netlify/blobs";
import { LIEU, jourLong, heureFr, cap } from "./rdv.mjs";
import { lienRdv } from "./lien.mjs";

export const VARIABLES = [
  ["prenom", "Prénom de la personne"], ["date", "Date du rendez-vous (ex. mardi 21 octobre)"], ["heure", "Heure (ex. 14 h)"],
  ["salle", "Salle"], ["therapeute", "Prénom du thérapeute"], ["lieu", "Adresse"], ["seances", "Séances déjà réalisées"], ["contact", "Mail de CAPSULE"],
  ["lien", "Lien pour annuler ou changer de créneau (rendez-vous à venir)"],
];
const FIN = "\n\nL'équipe CAPSULE, Université Paris 8";
const EMP = "\n\nUn empêchement ? Vous pouvez annuler ou demander un autre créneau en un clic : {{lien}}\nPour toute question, répondez simplement à ce mail." + FIN;
// Les modèles qui s'envoient avec un rendez-vous reçoivent le lien même si l'équipe a modifié leur texte avant cette fonction.
const AVEC_LIEN = ["invitation", "modification", "rappel"];

// auto : envoyé automatiquement par la plateforme (avec invitation d'agenda)
export const DEFAUTS = {
  invitation: { nom: "Confirmation de rendez-vous", auto: true, quand: "À la planification d'un rendez-vous", objet: "Votre rendez-vous CAPSULE, {{date}} à {{heure}}",
    corps: "Bonjour {{prenom}},\n\nVotre rendez-vous est confirmé.\n\nQuand : {{date}} à {{heure}} (durée : 1 h)\nOù : {{salle}}, {{lieu}}\nAvec : {{therapeute}}, étudiant·e de M2 en psychologie\n\nMétro ligne 13, station Saint-Denis–Université. Pas besoin d'apporter quoi que ce soit.\nL'invitation jointe s'ajoute à votre agenda, et nous vous enverrons un rappel la veille." + EMP },
  modification: { nom: "Rendez-vous déplacé", auto: true, quand: "Quand un rendez-vous est déplacé", objet: "Rendez-vous modifié CAPSULE, {{date}} à {{heure}}",
    corps: "Bonjour {{prenom}},\n\nVotre rendez-vous a été déplacé.\n\nNouveau créneau : {{date}} à {{heure}} (durée : 1 h)\nOù : {{salle}}, {{lieu}}\nAvec : {{therapeute}}\n\nL'invitation jointe met à jour votre agenda." + EMP },
  rappel: { nom: "Rappel de la veille", auto: true, quand: "La veille du rendez-vous, vers 17-18 h", objet: "Rappel : rendez-vous CAPSULE demain à {{heure}}",
    corps: "Bonjour {{prenom}},\n\nPetit rappel : votre rendez-vous CAPSULE a lieu demain, {{date}} à {{heure}}.\nOù : {{salle}}, {{lieu}}\nAvec : {{therapeute}}" + EMP },
  annulation: { nom: "Annulation de rendez-vous", auto: true, quand: "Quand un rendez-vous est annulé", objet: "Rendez-vous CAPSULE annulé, {{date}} à {{heure}}",
    corps: "Bonjour {{prenom}},\n\nVotre rendez-vous du {{date}} à {{heure}} est annulé. Nous reviendrons vers vous pour en fixer un nouveau.\n\nPour toute question, répondez simplement à ce mail." + FIN },
  annulation_patient: { nom: "Annulation par la personne", auto: true, quand: "Quand la personne annule depuis le lien de son mail", objet: "Annulation prise en compte, CAPSULE",
    corps: "Bonjour {{prenom}},\n\nNous avons bien pris en compte l'annulation de votre rendez-vous du {{date}} à {{heure}}.\n\nSi vous souhaitez reprendre rendez-vous plus tard, répondez simplement à ce mail : nous reviendrons vers vous. Vous pouvez nous écrire à tout moment.\n\nSi vous traversez un moment difficile, le 3114 (24 h/24, gratuit) ou le 15 restent joignables." + FIN },
  report_patient: { nom: "Demande de report reçue", auto: true, quand: "Quand la personne demande un autre créneau depuis le lien de son mail", objet: "Demande de report reçue, CAPSULE",
    corps: "Bonjour {{prenom}},\n\nNous avons bien reçu votre demande : votre rendez-vous du {{date}} à {{heure}} est libéré.\n\nNous vous proposons un nouveau créneau dans les meilleurs délais, en tenant compte des jours que vous nous avez indiqués. Vous pouvez aussi répondre à ce mail pour nous préciser vos disponibilités." + FIN },
  reorientation: { nom: "Changement de psychologue", auto: true, quand: "Quand le suivi passe à un·e autre étudiant·e psy", objet: "Votre suivi CAPSULE continue avec {{therapeute}}",
    corps: "Bonjour {{prenom}},\n\nPour des raisons d'organisation, votre suivi à CAPSULE continue avec {{therapeute}}, étudiant·e de M2 en psychologie.\n\nSi vous aviez un rendez-vous à venir, il est maintenu aux mêmes jour, heure et salle, et nous vous enverrons un rappel la veille. Si vous préférez un autre créneau, ou si ce changement ne vous convient pas, répondez simplement à ce mail.\n\nVos informations restent confidentielles : seule la personne qui vous suit y a accès." + FIN },
  reorientation_attente: { nom: "Suivi repris par un·e autre étudiant·e", auto: true, quand: "Quand le suivi est remis à disposition de l'équipe", objet: "Votre suivi CAPSULE",
    corps: "Bonjour {{prenom}},\n\nPour des raisons d'organisation, un·e autre étudiant·e de l'équipe va reprendre votre suivi à CAPSULE. Nous revenons vers vous très vite pour vous proposer un rendez-vous, en tenant compte des jours qui vous conviennent.\n\nVous pouvez aussi répondre à ce mail pour nous préciser vos disponibilités ou nous poser une question.\n\nSi vous traversez un moment difficile d'ici là, le 3114 (24 h/24, gratuit) ou le 15 restent joignables." + FIN },
  premier_contact: { nom: "Réponse à une demande", auto: false, quand: "À envoyer à la main après une nouvelle demande", objet: "Votre demande auprès de CAPSULE",
    corps: "Bonjour {{prenom}},\n\nMerci d'avoir pris contact avec CAPSULE. Nous pouvons vous proposer un premier rendez-vous gratuit, d'une heure, à l'université (bâtiment C), du lundi au mercredi entre 9 h et 17 h.\n\nQuels jours et horaires vous conviendraient ? Répondez simplement à ce mail et nous fixons cela ensemble." + FIN },
  attente: { nom: "Liste d'attente", auto: false, quand: "Quand toutes les places sont prises", objet: "Votre demande auprès de CAPSULE",
    corps: "Bonjour {{prenom}},\n\nMerci d'avoir pris contact avec CAPSULE. Toutes nos places sont occupées en ce moment : votre demande est placée sur liste d'attente, dans l'ordre d'arrivée. Nous vous écrirons dès qu'une place se libère. Nous ne pouvons pas dire précisément quand, mais votre demande est bien enregistrée.\n\nSi vous préférez ne pas attendre ou si votre situation devient difficile, le 3114 (24 h/24, gratuit) ou le 15 restent joignables, et vous trouverez d'autres ressources (santé universitaire, Santé Psy Étudiant, Nightline…) sur notre site, rubrique Ressources.\n\nSi vous n'avez plus besoin de rendez-vous, dites-le-nous simplement : nous libérerons votre place dans la liste." + FIN },
  relance: { nom: "Relance", auto: false, quand: "Sans réponse après quelques jours", objet: "Votre demande auprès de CAPSULE",
    corps: "Bonjour {{prenom}},\n\nNous revenons vers vous suite à votre demande auprès de CAPSULE. Souhaitez-vous toujours un rendez-vous ? Si oui, dites-nous quels jours vous conviennent. Sinon, aucun souci : nous clôturerons simplement votre demande." + FIN },
  prochaine: { nom: "Prochaine séance", auto: false, quand: "Après une séance, pour convenir de la suivante", objet: "Votre prochaine séance CAPSULE",
    corps: "Bonjour {{prenom}},\n\nMerci pour cette séance. Nous vous proposons de fixer la prochaine. Quels jours et horaires vous conviendraient dans les semaines à venir ?" + FIN },
  cloture: { nom: "Fin du suivi", auto: false, quand: "À la fin de l'accompagnement", objet: "Fin de votre suivi à CAPSULE",
    corps: "Bonjour {{prenom}},\n\nVotre suivi à CAPSULE se termine. Merci de votre confiance. Si vous en ressentez le besoin, vous pouvez nous réécrire à tout moment.\n\nEn cas d'urgence, appelez le 3114 (24 h/24, gratuit) ou le 15." + FIN },
  libre: { nom: "Message libre", auto: false, quand: "Pour tout autre message", objet: "", corps: "Bonjour {{prenom}},\n\n\n" + FIN.trim() },
};

export async function chargerModeles() {
  const st = getStore("modeles"), out = {};
  for (const [id, d] of Object.entries(DEFAUTS)) {
    const o = await st.get(id, { type: "json" });
    out[id] = { id, ...d, objet: o?.objet ?? d.objet, corps: o?.corps ?? d.corps, modifie: !!o };
  }
  return out;
}
export function variables(r, nbSeances) {
  return {
    prenom: r.prenom || "", date: r.rdvDate ? jourLong(r.rdvDate) : "", heure: r.rdvHeure ? heureFr(r.rdvHeure) : "", salle: r.salle || "",
    therapeute: cap(r.therapeute || r.assigne || ""), lieu: LIEU, seances: String(nbSeances ?? (r.seances || []).filter((s) => s.issue === "realisee").length),
    contact: process.env.MAIL_USER || "capsule-contact@gmail.com",
    lien: r.id && r.rdvId ? lienRdv(r.id, r.rdvId) : "",
  };
}
export function rendre(txt, v) { return String(txt || "").replace(/\{\{(\w+)\}\}/g, (_, k) => (k in v ? v[k] : "")); }
export function manquants(txt, v) { return [...new Set([...String(txt || "").matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].filter((k) => k in v && !v[k]); }
export function avecLien(id, corps, v) {
  let c = String(corps || "");
  if (v.lien && AVEC_LIEN.includes(id) && !c.includes("{{lien}}")) {
    const add = "\n\nUn empêchement ? Vous pouvez annuler ou demander un autre créneau en un clic : {{lien}}";
    c = c.endsWith(FIN) ? c.slice(0, -FIN.length) + add + FIN : c + add;
  }
  // sans lien disponible, les lignes qui le mentionnent sont retirées plutôt que laissées à moitié vides
  return v.lien ? c : c.split("\n").filter((l) => !l.includes("{{lien}}")).join("\n");
}
export async function texte(id, r) {
  const m = (await chargerModeles())[id], v = variables(r);
  return { subject: rendre(m.objet, v), text: rendre(avecLien(id, m.corps, v), v) };
}

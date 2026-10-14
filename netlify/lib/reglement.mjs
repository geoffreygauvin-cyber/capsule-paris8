/* Règlement intérieur de l'équipe CAPSULE : TEXTE DE DÉPART.
   Le texte en vigueur se modifie directement dans la plateforme (Gestion > Juridique, bouton « Modifier le texte ») : il est alors enregistré dans la base,
   et ce fichier ne sert plus que de point de départ (premier brouillon, ou « Rétablir le texte de départ »).
   Dans « p » : une ligne = un paragraphe ; une ligne qui commence par « - » devient une puce. Écriture inclusive avec le point médian, comme sur tout le site.
   Ce texte est un PROJET à faire valider par la coordination et les laboratoires porteurs avant publication. */
import { createHash } from "node:crypto";

export const TITRE = "Règlement intérieur de l'équipe CAPSULE";
export const INTRO =
  "CAPSULE propose des consultations psychologiques gratuites aux étudiant·es de l'Université Paris 8, assurées par des étudiant·es de Master de psychologie, sous supervision. Le dispositif est porté par trois laboratoires de recherche : DysCo, LAPPS et LPPC. Ce règlement fixe les règles de fonctionnement de l'équipe et les engagements de chacun·e. Il existe pour que les personnes reçues soient accueillies dans un cadre sûr, et pour que l'équipe travaille sereinement.";

export const ARTICLES = [
  {
    t: "Objet et champ d'application",
    p: [
      "Le présent règlement s'applique à toute personne qui dispose d'un compte sur l'espace équipe de CAPSULE : étudiant·es psy, admins (coordination) et service technique.",
      "Il complète, sans les remplacer, les règles de l'Université Paris 8, celles de l'UFR de psychologie et le Code de déontologie des psychologues. En cas de contradiction, ces textes priment.",
    ],
  },
  {
    t: "Mission et limites du dispositif",
    p: [
      "CAPSULE reçoit gratuitement, sur rendez-vous, les étudiant·es de Paris 8 : de 6 à 8 séances, le lundi, le mardi et le mercredi de 9 h à 17 h, bâtiment C du campus.",
      "CAPSULE n'est pas un service d'urgence. Face à un danger immédiat, la personne est invitée à appeler le 3114, le 15 ou le 112, et le ou la membre concerné·e prévient sans attendre un·e admin.",
      "Les membres n'ont pas vocation à prescrire ni à remplacer un suivi médical ou psychiatrique. Quand la situation le demande, ils et elles orientent, avec l'aide de l'équipe.",
      "Aucune contrepartie financière n'est demandée ni acceptée de la part des personnes reçues : ni argent, ni cadeau de valeur.",
    ],
  },
  {
    t: "Confidentialité et secret professionnel",
    p: [
      "Tout ce que confie une personne reçue est confidentiel : son identité, sa demande, le contenu des séances, et même le fait qu'elle consulte. Les membres sont tenu·es à la confidentialité et au secret professionnel (article 226-13 du Code pénal).",
      "Il est interdit d'évoquer une personne reçue en dehors de l'équipe, auprès de proches, de camarades, d'enseignant·es ou sur les réseaux sociaux, y compris sans la nommer si elle peut être reconnue.",
      "Les situations sont partagées au sein de l'équipe uniquement quand cela sert l'accompagnement, notamment en supervision, avec le minimum d'éléments identifiants.",
      "Un·e membre qui reconnaît une personne de son entourage (camarade, ami·e, proche) en parle sans détail à un·e admin. La personne est alors reçue par quelqu'un d'autre.",
      "Aucun contact avec une personne reçue en dehors du cadre de CAPSULE : pas de demande d'ami·e, pas de messagerie privée, pas de relation autre que professionnelle.",
      "En cas de danger grave pour la personne ou pour autrui, ou de mineur ou de personne vulnérable en danger, le ou la membre ne reste pas seul·e avec la situation : il ou elle prévient immédiatement un·e admin ou le ou la superviseur·e. La décision de lever le secret se prend avec eux, dans le cadre prévu par la loi.",
      "Cet engagement se poursuit après la fin de la participation à CAPSULE.",
    ],
  },
  {
    t: "Données personnelles et plateforme",
    p: [
      "Chaque compte est personnel. Le code d'accès ne se partage avec personne et ne s'écrit nulle part où d'autres pourraient le lire. Sur un ordinateur partagé, on se déconnecte après usage. En cas de perte ou de vol d'un appareil, un·e admin est prévenu·e tout de suite pour changer le code.",
      "Chacun·e ne consulte que les informations nécessaires à son travail, jamais par curiosité. Les fiches et les demandes de personnes que l'on n'accompagne pas ne sont pas ouvertes sans raison.",
      "Aucune donnée sur une personne reçue ne sort de la plateforme : pas de capture d'écran, pas de copie sur un appareil, un mail ou un cloud personnels, pas de transfert, sauf export demandé par un·e admin pour les besoins du dispositif.",
      "Les notes de la plateforme restent brèves, factuelles et utiles à l'organisation de l'accompagnement. Le contenu détaillé des échanges n'y est pas consigné.",
      "Quand une personne demande l'accès à ses données, leur correction ou leur effacement, la demande est transmise sans délai aux admins, qui y répondent.",
    ],
  },
  {
    t: "Cadre des séances",
    p: [
      "Les séances ont lieu dans le lieu et sur les créneaux validés par l'équipe. Aucun rendez-vous n'est fixé en dehors de ce cadre.",
      "Chaque membre se présente avec son statut réel : étudiant·e de Master de psychologie, en formation et supervisé·e. Personne ne s'attribue un titre qu'il ou elle ne détient pas.",
      "Chaque séance est confirmée dans la plateforme (« réalisée » ou « absent·e ») dès qu'elle a eu lieu. Les heures de consultation sont comptées à partir de ces confirmations : elles doivent être exactes.",
      "À l'issue des 6 à 8 séances, ou plus tôt si la situation l'exige, le ou la membre oriente la personne vers une suite adaptée, avec l'aide de l'équipe.",
      "Le cadre reste strictement professionnel : on ne reçoit pas un·e proche, et aucune relation intime, financière ou amicale ne se noue avec une personne reçue.",
    ],
  },
  {
    t: "Supervision et réunions",
    p: [
      "Les supervisions et les réunions d'équipe sont programmées dans la plateforme. Chaque membre y participe et prévient en cas d'empêchement.",
      "Les situations difficiles sont portées en supervision plutôt que gardées seul·e. Poser une question n'est jamais un aveu de faiblesse, c'est une partie du travail.",
    ],
  },
  {
    t: "Disponibilité, absences et annulations",
    p: [
      "Un·e membre qui ne peut pas assurer un rendez-vous modifie ou annule le créneau dans la plateforme dès qu'il ou elle le sait, afin que la personne reçue soit prévenue. En cas d'urgence, il ou elle appelle un·e admin.",
      "Une personne qui a pris rendez-vous ne reste jamais sans réponse : les demandes et les messages sont traités dans les meilleurs délais.",
      "Des retards ou absences répétés non signalés donnent lieu à un échange avec la coordination.",
    ],
  },
  {
    t: "Respect et comportement",
    p: [
      "Les membres se traitent avec respect et bienveillance. Les propos ou comportements discriminatoires, le harcèlement et toute forme de violence, notamment sexiste ou sexuelle, sont proscrits.",
      "Toute situation de ce type, entre membres ou envers une personne reçue, est signalée à un·e admin ou aux laboratoires porteurs. Les dispositifs de l'université peuvent aussi être saisis. Personne n'a à subir de conséquence pour avoir fait un signalement de bonne foi.",
      "Un·e membre déclare tout conflit d'intérêts, par exemple un lien avec une personne reçue.",
      "Les locaux sont laissés propres et rangés, le matériel remis en place, et les anomalies signalées aux admins.",
    ],
  },
  {
    t: "Communication et image de CAPSULE",
    p: [
      "Personne ne s'exprime au nom de CAPSULE (réseaux sociaux, presse, études, interventions) sans l'accord de la coordination.",
      "Le nom et le logo de CAPSULE s'utilisent uniquement avec les modèles et la charte graphique de l'équipe.",
      "Aucun témoignage, exemple ou anecdote issu des consultations n'est utilisé dans une communication, même anonymisé.",
    ],
  },
  {
    t: "Rôles dans l'équipe",
    p: [
      "Les étudiant·es psy reçoivent les personnes, tiennent leurs fiches à jour, confirment leurs séances et participent à la supervision.",
      "Les admins traitent les demandes, organisent les plannings, gèrent les comptes et suivent l'activité. Leurs droits d'accès sont plus étendus : ils s'en servent uniquement pour ce que leur rôle exige, avec la même obligation de confidentialité.",
      "Le service technique maintient la plateforme. Il dispose de droits d'administration pour cela, n'ouvre pas de données de personnes reçues sans nécessité, et respecte la même confidentialité.",
      "La coordination décide des questions de fonctionnement. Celles qu'elle ne peut pas trancher sont portées aux laboratoires porteurs.",
    ],
  },
  {
    t: "Manquements",
    p: [
      "Un manquement au règlement donne lieu, selon sa gravité, à un échange, à un rappel écrit, à une suspension du compte ou des séances, ou à la fin de la participation à CAPSULE. La personne concernée est entendue avant toute décision.",
      "Une atteinte à la confidentialité est une faute grave : le compte peut être suspendu sans attendre. Les suites prévues par l'université et par la loi restent possibles.",
    ],
  },
  {
    t: "Fin de participation",
    p: [
      "Quand un·e membre quitte l'équipe, son compte est désactivé et ses accès prennent fin. Les personnes qu'il ou elle accompagnait sont confiées à un·e autre membre, et ses séances sont confirmées avant son départ.",
      "Aucune donnée n'est conservée hors de la plateforme, et l'obligation de confidentialité continue.",
    ],
  },
  {
    t: "Acceptation et modification",
    p: [
      "Chaque membre lit le règlement en entier et le signe depuis la plateforme, en saisissant son nom. La plateforme conserve le nom, la date et la version signée.",
      "Le règlement peut évoluer. Lorsqu'un changement important est publié, la version change et chacun·e est invité·e à relire et à signer à nouveau.",
    ],
  },
];

export const DEFAUT = { titre: TITRE, intro: INTRO, articles: ARTICLES };

/* Nettoie et valide un texte envoyé par l'éditeur. Retourne { titre, intro, articles } ou { error }. */
const net = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]+/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, n);
export function nettoyer(d) {
  if (!d || typeof d !== "object") return { error: "Texte invalide." };
  const titre = net(d.titre, 120) || "Règlement intérieur", intro = net(d.intro, 2500);
  const src = Array.isArray(d.articles) ? d.articles : [];
  if (src.length > 40) return { error: "40 articles au maximum." };
  const articles = [];
  for (const a of src) {
    const t = net(a?.t, 120), p = (Array.isArray(a?.p) ? a.p : []).map((x) => net(x, 1500)).filter(Boolean);
    if (!t && !p.length) continue;
    if (!t) return { error: "Chaque article doit avoir un titre." };
    if (p.length > 60) return { error: "« " + t + " » : 60 lignes au maximum par article." };
    articles.push({ t, p });
  }
  return { titre, intro, articles };
}
/* Empreinte du texte exact (SHA-256) : sert d'identifiant à chaque version publiée et est enregistrée avec chaque signature. */
export const empreinte = (d) => createHash("sha256").update(JSON.stringify({ titre: d.titre, intro: d.intro, articles: d.articles.map((a) => ({ t: a.t, p: a.p })) })).digest("hex").slice(0, 32);

/* Fiches de prévention pour les personnes reçues à CAPSULE.
   Une fiche = une page A4 : à lire dans la plateforme (Ressources > Fiches patients), à imprimer pour la séance, ou à envoyer par mail.
   Il y a deux sources de fiches :
   - les fiches DE BASE, écrites ci-dessous (modifiables ici, au prochain déploiement) ;
   - les fiches CRÉÉES SUR LE SITE par les admins (Ressources > Fiches patients > « Nouvelle fiche », modèle à remplir avec aperçu), enregistrées dans la base (store « fiches »).
   Format d’une fiche de base : { id, theme, titre, accroche, mots (recherche), icone, blocs: [{ t, p?: [paragraphes], l?: [puces], q?: "phrase de fin", k?: genre }], aide: "Quand en parler…", plus?: [numéros ou sites utiles propres à la fiche] }.
   Genres d’une liste (k) : "liste" (coches, par défaut), "etapes" (numérotée), "eviter" (croix rouges, détecté aussi quand le titre commence par « À éviter » ou « Ce qui n’aide pas »), "questions" (« ? »).
   Le rendu (écran, impression A4, mail) part toujours de « sections(f) » : une suite de { t: titre, k: genre ("texte", "liste", "etapes", "eviter", "questions"), lines: [lignes] }.
   Vouvoiement, ton simple et doux, sans jargon, comme sur le reste du site.
   Ces textes donnent des repères généraux et ne remplacent pas un avis médical. Ils sont à faire relire par les superviseur·es avant usage. */

export const VERSION = "2026-10";

export const CONTACT = "capsule-contact@gmail.com";
export const AVERTISSEMENT = "Cette fiche donne des repères généraux. Elle ne remplace ni une consultation, ni un avis médical.";
export const URGENCES = [
  ["3114", "Prévention du suicide, gratuit, 24 h/24 et 7 j/7"],
  ["15 ou 112", "Urgence médicale ou danger immédiat"],
];
export const SOUTIENS = [
  ["Fil Santé Jeunes", "0 800 235 236", "Anonyme et gratuit, 12-25 ans"],
  ["SOS Amitié", "09 72 39 40 50", "Écoute anonyme, jour et nuit"],
  ["Nightline Paris", "nightline.fr", "Écoute entre étudiant·es, la nuit"],
  ["Santé Psy Étudiant", "santepsy.etudiant.gouv.fr", "Séances gratuites chez un·e psychologue partenaire"],
];

export const FICHES = [
  {
    id: "sommeil", theme: "Sommeil", titre: "Mieux dormir",
    accroche: "Quelques repères simples pour retrouver un sommeil plus régulier.",
    mots: "insomnie dormir nuit fatigue réveil endormissement écrans",
    blocs: [
      { t: "Pourquoi le sommeil se dérègle", p: ["Le stress, des horaires décalés, des écrans tard le soir ou une période chargée suffisent à le dérégler. Une mauvaise nuit n’a rien de grave. C’est quand elles s’enchaînent que la fatigue pèse sur l’humeur, la concentration et l’anxiété."] },
      { t: "Ce qui aide", l: [
        "Se lever à peu près à la même heure chaque jour, week-end compris : c’est le repère le plus efficace.",
        "Prendre la lumière du jour le matin, dehors si possible.",
        "Garder le lit pour dormir : travailler ou regarder des séries ailleurs.",
        "Baisser les lumières et poser le téléphone 30 à 60 minutes avant de se coucher.",
        "Réserver café, thé et boissons énergisantes à la matinée et au début d’après-midi.",
        "Bouger dans la journée, mais pas juste avant de dormir."] },
      { t: "Quand le sommeil ne vient pas", l: [
        "Éviter de regarder l’heure.",
        "Au bout de 20 minutes environ, se lever et faire quelque chose de calme sous une lumière douce (lire, écouter de la musique), puis revenir au lit quand le sommeil revient.",
        "Noter ses soucis sur une feuille en début de soirée, pour ne pas les ruminer au lit."] },
      { t: "À éviter", l: [
        "L’alcool pour s’endormir : il endort vite mais découpe le sommeil.",
        "Les siestes longues ou tardives. Si besoin, 20 minutes avant 15 h.",
        "Dormir très tard le week-end pour rattraper : cela décale encore l’horloge.",
        "Prendre des somnifères ou de la mélatonine sans avis : parlez-en à un·e médecin ou à un·e pharmacien·ne."] },
    ],
    aide: "Si les difficultés durent depuis plus de trois semaines, si la fatigue gêne vos journées ou si votre moral baisse, parlez-en. Il existe des méthodes efficaces sans médicaments, comme la thérapie cognitivo-comportementale de l’insomnie. Un·e médecin ou un·e psychologue peut vous orienter.",
  },
  {
    id: "anxiete", theme: "Anxiété", titre: "Apaiser l’anxiété",
    accroche: "Comprendre ce qui se passe dans le corps, et quelques gestes pour redescendre.",
    mots: "angoisse stress peur inquiétude nervosité tension",
    blocs: [
      { t: "Ce qui se passe", p: ["L’anxiété est un système d’alarme. Face à une menace réelle ou imaginée, le cœur accélère, le souffle se raccourcit, les muscles se tendent. C’est désagréable mais pas dangereux, et cela redescend. Un peu d’anxiété est même utile : elle prépare à agir. Elle devient pesante quand l’alarme sonne trop souvent ou trop fort."] },
      { t: "Sur le moment", l: [
        "Souffler lentement : inspirer par le nez pendant 4 secondes, expirer doucement par la bouche pendant 6 secondes, pendant 2 à 3 minutes. Une expiration plus longue apaise le corps.",
        "Ramener l’attention ici et maintenant : repérer 5 choses que l’on voit, 4 que l’on touche, 3 que l’on entend, 2 que l’on sent, 1 que l’on goûte.",
        "Se dire : « C’est de l’anxiété, elle va passer »."] },
      { t: "Sur la durée", l: [
        "Se donner un « temps d’inquiétude » de 15 minutes par jour : noter les soucis, puis les laisser de côté jusqu’au lendemain.",
        "Aller vers ce que l’on évite, petit pas par petit pas. L’évitement soulage sur le moment mais entretient la peur.",
        "Bouger régulièrement, dormir assez, réduire le café et les boissons énergisantes.",
        "En parler à une personne de confiance : dire les choses allège déjà."] },
    ],
    aide: "Si l’anxiété dure depuis plusieurs semaines, si elle vous empêche d’aller en cours, de sortir ou de dormir, ou si vous avez des crises d’angoisse à répétition, parlez-en. Cela se soigne bien, et plus on en parle tôt, plus c’est simple.",
  },
  {
    id: "moral", theme: "Moral", titre: "Quand le moral reste bas",
    accroche: "Repérer les signes, et ce qui peut aider à petits pas.",
    mots: "dépression déprime tristesse fatigue envie découragement idées noires cafard",
    blocs: [
      { t: "Un mauvais passage ou plus ?", p: ["Tout le monde a des jours sans. On parle d’un moral durablement bas quand, depuis au moins deux semaines et presque tous les jours, plusieurs de ces signes sont là :"],
        l: ["Tristesse ou sentiment de vide.", "Perte d’intérêt ou de plaisir pour ce qu’on aimait.", "Grande fatigue, impression d’être ralenti·e.", "Sommeil ou appétit très modifiés.", "Difficultés à se concentrer, à décider.", "Sentiment de ne rien valoir ou de culpabilité."] },
      { t: "Ce n’est pas un manque de volonté", p: ["Quand le moral est bas, tout demande plus d’efforts. Ce n’est ni de la paresse ni de votre faute. Cela se soigne."] },
      { t: "Ce qui peut aider", l: [
        "Faire un tout petit pas à la fois : une activité par jour, même brève et même sans envie (une douche, dix minutes de marche, un appel). L’envie vient souvent après l’action, pas avant.",
        "Garder des repères : lever, repas et coucher à des heures régulières.",
        "Sortir à la lumière du jour, bouger un peu.",
        "Ne pas rester seul·e avec ça : prévenir une personne proche, même sans tout expliquer.",
        "Limiter l’alcool, qui aggrave le moral."] },
    ],
    aide: "Dès que ces signes durent plus de deux semaines ou gênent votre quotidien, parlez-en à un·e médecin ou à un·e psychologue : on peut vous aider, et les études peuvent s’aménager. Si des idées de mort ou de suicide apparaissent, ne les gardez pas pour vous : appelez le 3114 (gratuit, 24 h/24). En cas de danger immédiat, appelez le 15 ou le 112.",
  },
  {
    id: "examens", theme: "Études", titre: "Stress des partiels",
    accroche: "Rester efficace sans s’épuiser, avant et pendant les examens.",
    mots: "examen partiel révisions trac concentration mémoire stress études",
    blocs: [
      { t: "Un peu de stress aide", p: ["Une dose de stress donne l’énergie de travailler. Trop, il brouille la mémoire et la concentration. L’objectif n’est pas de le supprimer, mais de le garder à un niveau utile."] },
      { t: "Avant les partiels", l: [
        "Faire un planning réaliste, jour par jour, avec des pauses et au moins une demi-journée libre par semaine.",
        "Travailler par blocs de 25 à 50 minutes, suivis de 5 à 10 minutes de pause.",
        "S’interroger plutôt que relire : se tester, refaire des exercices, expliquer à voix haute. C’est ce qui fait le mieux retenir.",
        "Étaler les révisions plutôt que tout concentrer la veille.",
        "Protéger son sommeil : une nuit complète vaut mieux qu’une nuit de révision.",
        "Manger, boire de l’eau et bouger un peu chaque jour."] },
      { t: "Le jour J", l: [
        "Arriver à l’heure sans trop d’avance, pour ne pas absorber le stress des autres.",
        "Respirer lentement quelques minutes avant de commencer.",
        "Lire tout le sujet, puis commencer par ce que l’on maîtrise.",
        "Trou de mémoire : respirer, passer à la suite, y revenir plus tard."] },
      { t: "Après", p: ["Éviter de refaire l’examen avec les autres : cela n’aide pas et cela angoisse. Reposez-vous."] },
    ],
    aide: "Si l’angoisse vous empêche de travailler ou de vous présenter aux examens, ou si le sommeil et l’appétit sont touchés depuis plusieurs semaines, parlez-en en séance, à vos enseignant·es ou au service de santé universitaire.",
  },
  {
    id: "respiration", theme: "Détente", titre: "Respirer pour se détendre",
    accroche: "Trois exercices simples, à faire en quelques minutes, n’importe où.",
    mots: "relaxation respiration cohérence cardiaque détente ancrage calme méditation",
    blocs: [
      { t: "La respiration lente (5 minutes)", p: ["Asseyez-vous confortablement. Inspirez par le nez pendant 5 secondes, puis expirez doucement pendant 5 secondes. Continuez pendant 5 minutes, soit environ 6 respirations par minute. Mieux vaut peu mais souvent, par exemple matin, midi et soir, que seulement quand ça ne va pas."] },
      { t: "La détente musculaire (10 minutes)", k: "etapes", l: [
        "Assis·e ou allongé·e, serrez un groupe de muscles pendant 5 secondes : poings, bras, épaules, visage, ventre, jambes, pieds.",
        "Relâchez d’un coup et remarquez la différence pendant 10 secondes.",
        "Passez au groupe suivant, des pieds à la tête ou l’inverse."] },
      { t: "L’ancrage 5-4-3-2-1 (2 minutes)", p: ["Repérez 5 choses que vous voyez, 4 que vous touchez, 3 que vous entendez, 2 que vous sentez, 1 que vous goûtez. L’attention revient dans l’instant présent."] },
      { t: "Quelques conseils", l: [
        "Ne forcez jamais : si vous avez le tournis ou si vous êtes mal à l’aise, revenez à une respiration normale.",
        "Choisissez un moment calme au début, pour que le geste devienne facile avant d’en avoir besoin.",
        "En cas de problème respiratoire ou cardiaque, allez-y doucement et demandez conseil à votre médecin."] },
    ],
    aide: "Ces exercices aident à se détendre, mais ils ne remplacent pas un accompagnement quand l’anxiété ou le stress prennent beaucoup de place. N’hésitez pas à en parler en séance.",
  },
  {
    id: "ruminations", theme: "Pensées", titre: "Quand les pensées tournent en boucle",
    accroche: "Sortir de la rumination, un petit pas à la fois.",
    mots: "rumination ruminer pensées boucle ressasser inquiétude soucis insomnie",
    blocs: [
      { t: "Ruminer, c’est quoi ?", p: ["C’est repasser sans fin les mêmes pensées (« et si… », « pourquoi j’ai… ») en ayant l’impression de chercher une solution. En général, cela fatigue et fait baisser le moral. Chercher une solution mène à un plan. Ruminer tourne en rond."] },
      { t: "Ce qui aide", l: [
        "Repérer le moment et se dire : « là, je rumine ».",
        "Se demander : « Puis-je faire quelque chose maintenant ? » Si oui, noter la première petite action et la planifier. Si non, accepter que pour l’instant on ne peut rien y changer.",
        "Changer d’activité : marcher, ranger, cuisiner, appeler quelqu’un. Occuper les mains et l’attention marche mieux que se raisonner.",
        "Écrire ses pensées pendant 10 minutes, puis refermer le carnet.",
        "Reformuler : « j’ai la pensée que je vais échouer » plutôt que « je vais échouer ». Une pensée n’est pas un fait.",
        "Se fixer un moment de réflexion à heure fixe, et remettre le reste à plus tard."] },
      { t: "Le soir", p: ["Les pensées tournent plus fort au lit. Notez-les avant de vous coucher et gardez un carnet à portée de main."] },
    ],
    aide: "Si la rumination occupe une grande part de vos journées, vous empêche de dormir ou d’étudier, ou s’accompagne d’un moral bas, parlez-en. Une thérapie peut aider à en sortir.",
  },
  {
    id: "panique", theme: "Anxiété", titre: "Crise d’angoisse : que faire ?",
    accroche: "Une crise de panique est impressionnante, mais elle passe.",
    mots: "panique crise angoisse attaque palpitations souffle vertige",
    blocs: [
      { t: "Ce qui se passe", p: ["Cœur qui s’emballe, souffle court, vertiges, tremblements, impression de mourir ou de perdre le contrôle… La crise atteint son maximum en une dizaine de minutes environ, puis elle retombe. Elle fait très peur, mais elle est sans danger en elle-même."] },
      { t: "Pendant la crise", k: "etapes", l: [
        "Ne pas fuir si possible : s’asseoir, s’appuyer.",
        "Se dire : « C’est une crise de panique. Ça va passer. »",
        "Expirer lentement, plus longtemps que l’on inspire (4 secondes pour inspirer, 6 pour expirer).",
        "Ramener l’attention ici : sentir ses pieds au sol, nommer 5 choses que l’on voit.",
        "Boire une gorgée d’eau. Si quelqu’un est là, lui demander de rester près de soi sans en faire trop."] },
      { t: "Après", l: [
        "Se reposer un moment, boire, reprendre doucement son activité.",
        "Ne pas éviter les lieux où c’est arrivé : l’évitement entretient la peur d’une nouvelle crise.",
        "Noter ce qui s’est passé avant (fatigue, café, stress) aide à repérer des déclencheurs."] },
    ],
    aide: "À la première crise, ou si elle est différente des autres (douleur dans la poitrine, malaise), consultez un·e médecin pour écarter une cause physique. Si les crises reviennent ou si vous redoutez la prochaine, parlez-en : il existe des traitements efficaces. En cas de douleur intense dans la poitrine ou de difficulté à respirer qui ne passe pas, appelez le 15 ou le 112.",
  },
  {
    id: "procrastination", theme: "Études", titre: "Se mettre au travail",
    accroche: "Remettre au lendemain n’est pas de la paresse : voici comment démarrer.",
    mots: "procrastination motivation organisation travail devoirs mémoire retard",
    blocs: [
      { t: "Pourquoi on repousse", p: ["On repousse surtout pour éviter une émotion désagréable (peur d’échouer, ennui, impression d’être dépassé·e), pas par manque de volonté. Le soulagement est immédiat, la culpabilité arrive ensuite et rend le démarrage encore plus dur."] },
      { t: "Pour démarrer", l: [
        "Réduire la tâche : « ouvrir le document et écrire pendant 5 minutes ».",
        "La découper en étapes concrètes, dont la première est très facile.",
        "Fixer un quand et un où : « demain à 10 h à la bibliothèque, je fais les exercices 1 à 3 ».",
        "Éloigner les distractions : téléphone dans une autre pièce, notifications coupées.",
        "Travailler par séances de 25 minutes, suivies de 5 minutes de pause.",
        "Se récompenser après (café, marche, un épisode)."] },
      { t: "Quand on a décroché", p: ["Parlez-vous comme à un·e ami·e : se critiquer durement fait procrastiner davantage. Repartez de ce qui est possible aujourd’hui, pas de ce qui aurait dû être fait."] },
      { t: "Garder le cap", l: [
        "Préparer sa semaine le dimanche : trois priorités par jour au maximum.",
        "Travailler avec quelqu’un (bibliothèque, visio) aide beaucoup.",
        "Repérer le moment de la journée où l’on est le plus efficace."] },
    ],
    aide: "Si l’impossibilité de s’y mettre dure, s’accompagne d’une grande fatigue, d’un moral bas ou d’angoisse, ou menace votre année, parlez-en : il peut y avoir autre chose derrière, et on peut vous aider.",
  },
  {
    id: "solitude", theme: "Relations", titre: "Se sentir seul·e",
    accroche: "La solitude est courante chez les étudiant·es. On peut en sortir en commençant petit.",
    mots: "solitude isolement amis lien social seul seule relations",
    blocs: [
      { t: "C’est fréquent", p: ["Arriver dans une nouvelle ville, des cours à distance, des amis loin, des groupes déjà formés : beaucoup d’étudiant·es se sentent seul·es, même entouré·es. Ce n’est pas un défaut de personnalité."] },
      { t: "Premiers pas", l: [
        "Viser un seul lien à la fois : un message, un café, une invitation à réviser ensemble.",
        "Choisir des lieux avec une activité commune (association, sport, atelier, bibliothèque) : parler est plus facile quand on fait quelque chose ensemble.",
        "Reprendre contact avec quelqu’un que l’on a perdu de vue : souvent, la personne est contente d’avoir des nouvelles.",
        "Revenir régulièrement aux mêmes endroits aux mêmes heures, pour recroiser les mêmes visages."] },
      { t: "Ce qui n’aide pas", l: [
        "Attendre que les autres viennent vers soi.",
        "Se comparer aux réseaux sociaux, qui montrent surtout les bons moments.",
        "S’isoler davantage quand le moral baisse."] },
      { t: "Quand la nuit est dure", p: ["Des écoutes anonymes existent, y compris la nuit : voir en bas de page."] },
    ],
    aide: "Si la solitude pèse sur votre moral, votre sommeil ou vos études, ou si elle dure, parlez-en. En parler en séance est un bon premier pas.",
  },
  {
    id: "hygiene", theme: "Santé", titre: "Prendre soin de son corps pour aller mieux",
    accroche: "Bouger, manger, sortir : de petits réglages qui soutiennent le moral.",
    mots: "sport activité physique alimentation repas énergie lumière rythme habitudes",
    blocs: [
      { t: "Pourquoi ça compte", p: ["Le corps et l’humeur sont liés. Ces habitudes ne remplacent pas un suivi quand il est nécessaire, mais elles aident vraiment."] },
      { t: "Bouger", l: [
        "Une demi-heure de marche rapide la plupart des jours, ou toute activité qui plaît : danse, vélo, natation, sport collectif.",
        "Pas besoin d’être sportif·ve : on peut commencer par 10 minutes.",
        "Marcher entre deux sessions de travail fait déjà du bien à la tête."] },
      { t: "Manger", l: [
        "Des repas à peu près réguliers.",
        "Des aliments variés : fruits, légumes, féculents, protéines.",
        "De l’eau plutôt que des boissons sucrées ou énergisantes.",
        "Manger sans écran quand c’est possible."] },
      { t: "Lumière et rythme", l: [
        "Sortir un peu chaque jour, surtout le matin.",
        "Garder des horaires de lever réguliers."] },
      { t: "Se faire du bien", l: [
        "Prévoir chaque semaine un moment pour quelque chose qui fait plaisir, sans objectif de performance.",
        "Voir du monde, même brièvement."] },
    ],
    aide: "Si votre alimentation, votre sommeil ou votre énergie changent beaucoup pendant plusieurs semaines, si vous vous privez de manger ou si manger vous échappe, parlez-en à un·e médecin ou en séance.",
  },
  {
    id: "substances", theme: "Santé", titre: "Alcool, cannabis : faire le point",
    accroche: "Des repères, sans jugement, pour regarder sa consommation.",
    mots: "alcool cannabis drogue consommation tabac fête addiction produits",
    blocs: [
      { t: "Pourquoi on consomme", p: ["Pour faire la fête, se détendre, dormir, se sentir à l’aise avec les autres ou oublier un moment difficile. Ces raisons se comprennent. Le risque commence quand le produit devient le seul moyen d’y arriver."] },
      { t: "Repères pour l’alcool", l: [
        "Pas plus de 2 verres par jour, et pas plus de 10 par semaine.",
        "Des jours sans alcool chaque semaine.",
        "Un verre standard : un demi de bière (25 cl), un verre de vin (10 cl) ou un whisky (3 cl)."] },
      { t: "Ce que l’on observe", l: [
        "L’alcool endort vite mais abîme le sommeil, et peut aggraver l’anxiété et le moral le lendemain.",
        "Le cannabis peut diminuer la concentration et la mémoire, et augmenter l’anxiété chez certaines personnes.",
        "Mélanger plusieurs produits augmente les risques."] },
      { t: "Faire le point", p: ["Consommez-vous pour calmer l’anxiété, dormir ou tenir une journée ? Avez-vous du mal à vous arrêter ou à passer certains jours sans ? Vos études, vos relations ou votre budget en souffrent-ils ? Des proches s’inquiètent-ils ? Si vous répondez oui à l’une de ces questions, cela vaut la peine d’en parler."] },
      { t: "Pour réduire", l: [
        "Fixer une limite à l’avance et s’y tenir.",
        "Alterner avec de l’eau, manger avant de boire.",
        "Éviter de consommer seul·e pour gérer une émotion.",
        "Noter ses consommations pendant une semaine : c’est souvent instructif."] },
    ],
    aide: "Parlez-en en séance, à un·e médecin ou aux services ci-dessous, sans crainte d’être jugé·e : les professionnel·les accueillent tout le monde.",
    plus: ["Alcool Info Service : 0 980 980 930, anonyme et gratuit", "Drogues Info Service : 0 800 23 13 13, anonyme et gratuit", "Tabac Info Service : 39 89"],
  },
  {
    id: "estime", theme: "Confiance", titre: "Se parler avec bienveillance",
    accroche: "Apprivoiser la petite voix critique, sans se raconter d’histoires.",
    mots: "estime confiance critique autocritique culpabilité perfectionnisme honte image de soi",
    blocs: [
      { t: "La petite voix", p: ["Presque tout le monde a une voix intérieure qui critique (« je suis nul·le », « je n’y arriverai pas »). Elle prétend protéger, mais elle décourage. On ne peut pas la faire taire. On peut apprendre à ne plus tout lui croire."] },
      { t: "Pour la désamorcer", l: [
        "La repérer : écrire la phrase exacte qui passe en tête.",
        "Séparer les faits de l’interprétation : « j’ai raté cet exposé » est un fait, « je suis nul·le » est une interprétation.",
        "Se demander : « Que dirais-je à un·e ami·e dans la même situation ? », puis se le dire.",
        "Chercher ce qui a fonctionné, même petit : noter chaque soir trois choses réussies ou appréciées dans la journée.",
        "Se comparer moins : les réseaux montrent les réussites des autres, pas leurs doutes."] },
      { t: "Se traiter avec bienveillance", p: ["Se parler avec douceur n’est pas de la complaisance. Les personnes qui s’encouragent plutôt que de se punir se remettent en général mieux d’un échec, et réessaient plus volontiers."] },
    ],
    aide: "Si ces pensées sont constantes, très dures, ou s’accompagnent d’un moral bas, de honte ou de l’idée de ne pas mériter d’être aidé·e, parlez-en : on peut travailler dessus en consultation.",
  },
  {
    id: "vss", theme: "Violences", titre: "Violences sexistes et sexuelles : repères et soutien",
    accroche: "Si vous avez vécu ou vu quelque chose, vous n’êtes pas seul·e.",
    mots: "violences sexistes sexuelles harcèlement agression viol consentement victime témoin plainte",
    blocs: [
      { t: "Quelques repères", p: ["Les violences sexistes et sexuelles regroupent le harcèlement, les propos ou gestes sexuels non voulus, les agressions sexuelles, le viol et les violences dans le couple, y compris en ligne. Tout acte sexuel sans consentement est une violence."] },
      { t: "Ce n’est jamais de votre faute", p: ["Quelle que soit la situation, la responsabilité revient à la personne qui commet les violences, jamais à celle qui les subit."] },
      { t: "Réactions possibles", p: ["Elles varient beaucoup d’une personne à l’autre :"], l: [
        "Sidération, honte, colère, tristesse, ou parfois aucune émotion.",
        "Troubles du sommeil, cauchemars, souvenirs qui reviennent, anxiété.",
        "Difficultés à se concentrer, envie de s’isoler."], q: "Ce sont des réactions normales à une situation qui ne l’est pas." },
      { t: "Ce que vous pouvez faire", l: [
        "En parler à une personne de confiance, quand vous vous sentez prêt·e. Il n’y a pas de bon moment.",
        "Voir un·e médecin : soins, prévention, certificat si vous le souhaitez.",
        "Garder, si vous le pouvez, des traces : messages, captures d’écran, dates, noms. Rien n’est obligatoire.",
        "Porter plainte est possible, jamais obligatoire. Des délais existent : une association peut vous les préciser.",
        "Vous faire accompagner : des associations et des numéros d’écoute gratuits existent.",
        "Votre université propose un dispositif d’écoute et de signalement : renseignez-vous auprès de la vie étudiante."] },
      { t: "Si vous êtes témoin ou proche", l: [
        "Écouter sans juger ni minimiser.",
        "Croire la personne et lui laisser le choix de ses décisions.",
        "Rester présent·e et proposer de l’accompagner vers un soutien."] },
    ],
    aide: "À tout moment. Si ce que vous avez vécu pèse sur votre sommeil, votre moral ou votre quotidien, parlez-en en séance : vous serez écouté·e sans jugement.",
    plus: ["3919 : violences faites aux femmes, anonyme et gratuit", "France Victimes : 116 006, aide aux victimes", "En danger immédiat : 17 (police) ou 112, ou 114 par SMS si vous ne pouvez pas parler"],
  },
  {
    id: "numerique", theme: "Numérique", titre: "Réseaux sociaux et écrans : trouver son équilibre",
    accroche: "Garder ce qui fait du bien en ligne, et se protéger du reste.",
    mots: "réseaux sociaux écrans téléphone digital numérique instagram tiktok snapchat scroller défiler notifications comparaison harcèlement cyberharcèlement temps d’écran jeux vidéo",
    blocs: [
      { t: "Un outil, ni bon ni mauvais", p: ["Les réseaux et le téléphone aident à garder le lien, à s’informer, à se détendre. Ce qui compte, c’est l’effet qu’ils ont sur vous : plutôt apaisé·e et relié·e, ou plutôt tendu·e et seul·e après ?"] },
      { t: "Pour faire le point", k: "questions", l: [
        "Ouvrez-vous les applications par envie, ou par réflexe, par ennui ?",
        "Comment vous sentez-vous après dix minutes de défilement ?",
        "Votre sommeil, vos études ou vos proches en pâtissent-ils ?"] },
      { t: "Ce qui aide", l: [
        "Couper les notifications non essentielles : c’est vous qui ouvrez l’application, pas elle qui vous appelle.",
        "Laisser le téléphone hors du lit la nuit : un vrai réveil suffit.",
        "Prévoir des temps sans écran : les repas, la dernière demi-heure avant de dormir.",
        "Trier ses abonnements : quitter les comptes qui donnent envie de se comparer.",
        "Remplacer plutôt que supprimer : appeler quelqu’un, marcher ou lire là où l’on défile d’habitude."] },
      { t: "Le piège de la comparaison", p: ["Les réseaux montrent surtout des moments choisis et retouchés. Comparer sa vie ordinaire à la vitrine des autres fait mal et ne dit rien de votre valeur : faites une pause ou un tri dans votre fil."] },
      { t: "Se protéger en ligne", l: [
        "Régler la confidentialité de ses comptes ; réfléchir avant de partager photos, adresse ou emploi du temps.",
        "Face à des messages insultants ou menaçants : ne pas répondre, garder des captures d’écran, bloquer, signaler.",
        "Si des images intimes servent à faire pression : ne pas payer, garder les preuves, en parler, porter plainte.",
        "Le harcèlement en ligne est un délit : vous n’y êtes pour rien, et vous n’avez pas à le subir seul·e."] },
      { t: "À essayer cette semaine", k: "etapes", l: [
        "Un soir : le téléphone dort hors de la chambre.",
        "Un repas : sans écran.",
        "Un tri : se désabonner de trois comptes qui pèsent."] },
    ],
    aide: "Si vous voudriez être moins en ligne sans y arriver, si les écrans prennent la place du sommeil, des études ou des proches, ou si vous subissez du harcèlement ou du chantage : parlez-en en séance, à un·e médecin ou à une personne de confiance.",
    plus: [
      "3018 : aide contre le cyberharcèlement et les violences numériques, gratuit, tous les jours de 9 h à 23 h",
      "cybermalveillance.gouv.fr : conseils et assistance en cas de piratage, d’arnaque ou de chantage en ligne",
      "internet-signalement.gouv.fr (Pharos) : signaler un contenu illégal public. Menaces ou harcèlement : porter plainte (17 si danger immédiat)",
    ],
  },
];

/* Icône de chaque fiche de base (les fiches créées sur le site choisissent la leur dans la liste ICONES). */
export const ICONES = ["moon", "wind", "heart", "book", "users", "cloud", "bolt", "shield", "sun", "phone", "leaf", "star", "chat"];
const ICONE_DE = { sommeil: "moon", anxiete: "wind", moral: "sun", examens: "book", respiration: "wind", ruminations: "cloud", panique: "bolt", procrastination: "book", solitude: "users", hygiene: "leaf", substances: "leaf", estime: "star", vss: "shield", numerique: "phone" };
for (const f of FICHES) f.icone = f.icone || ICONE_DE[f.id] || "heart";

export const GENRES = ["texte", "liste", "etapes", "eviter", "questions"];
const genre = (b) => (b.k && GENRES.includes(b.k) ? b.k : b.l ? (/^\s*(à éviter|ce qui n.aide pas|les pièges)/i.test(b.t || "") ? "eviter" : "liste") : "texte");
/* Suite de sections à afficher : { t, k, lines }. Un bloc « paragraphe + liste + phrase de fin » devient trois sections (le titre reste sur la première). */
export function sections(f) {
  if (Array.isArray(f.sections)) return f.sections;
  const out = [];
  for (const b of f.blocs || []) {
    let t = b.t || "";
    if (b.p?.length) { out.push({ t, k: "texte", lines: b.p }); t = ""; }
    if (b.l?.length) { const k = genre(b); out.push({ t, k: k === "texte" ? "liste" : k, lines: b.l }); t = ""; }
    if (b.q) out.push({ t, k: "texte", lines: [b.q] });
  }
  return out;
}

/* Valide et nettoie une fiche envoyée par l’éditeur du site. Retourne { fiche } ou { error }. */
const net1 = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export const AIDE_DEFAUT = "Si cela dure ou pèse sur votre quotidien, parlez-en en séance, à un·e médecin ou à une personne de confiance : vous serez écouté·e sans jugement.";
export function nettoyerFiche(d) {
  if (!d || typeof d !== "object") return { error: "Fiche invalide." };
  const titre = net1(d.titre, 90), accroche = net1(d.accroche, 200);
  if (!titre) return { error: "Donnez un titre à la fiche." };
  if (!accroche) return { error: "Écrivez une phrase d’accroche (sous le titre)." };
  const src = Array.isArray(d.sections) ? d.sections : [];
  if (src.length > 12) return { error: "12 parties au maximum." };
  const secs = []; let total = 0;
  for (const x of src) {
    const lines = (Array.isArray(x?.lines) ? x.lines : []).map((l) => net1(l, 500)).filter(Boolean);
    const t = net1(x?.t, 90);
    if (!lines.length) continue;
    if (lines.length > 20) return { error: "20 lignes au maximum par partie." };
    total += lines.reduce((a, l) => a + l.length, 0);
    secs.push({ t, k: GENRES.includes(x?.k) ? x.k : "texte", lines });
  }
  if (!secs.length) return { error: "Ajoutez au moins une partie avec du texte." };
  if (total > 7000) return { error: "La fiche est trop longue pour tenir sur une page. Raccourcissez-la." };
  const plus = (Array.isArray(d.plus) ? d.plus : []).map((l) => net1(l, 240)).filter(Boolean).slice(0, 6);
  return { fiche: { titre, accroche, theme: net1(d.theme, 30) || "Divers", mots: net1(d.mots, 200), icone: ICONES.includes(d.icone) ? d.icone : "heart", sections: secs, aide: net1(d.aide, 700) || AIDE_DEFAUT, plus } };
}

/* ---------- mail ---------- */
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COUL = { liste: ["#AE164E", "#FDF5EB"], etapes: ["#7B206B", "#F4EBF8"], questions: ["#7B206B", "#F4EBF8"], eviter: ["#E30F1B", "#FDE9E4"] };
const FONT = "Poppins,'Helvetica Neue',Helvetica,Arial,sans-serif";
const para = (t) => `<p style="margin:0 0 10px;font-size:15px;line-height:1.6">${esc(t)}</p>`;
const marque = (k, i) => (k === "etapes" ? String(i + 1) : k === "eviter" ? "✕" : k === "questions" ? "?" : "✓");

export function courrier(f, { prenom = "", note = "" } = {}) {
  const objet = `CAPSULE · ${f.titre}`;
  const salut = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const intro = "Voici une fiche qui pourrait vous être utile. Gardez ce qui vous parle, et n’hésitez pas à en reparler lors d’une prochaine séance.";
  const mot = String(note || "").trim();
  const FIN = "L’équipe CAPSULE, Université Paris 8";
  const pied = "CAPSULE propose des consultations psychologiques gratuites aux étudiant·es de l’Université Paris 8. Pour nous écrire, répondez simplement à ce mail.";
  const S = sections(f);

  // texte brut
  const T = [salut, "", intro];
  if (mot) T.push("", mot);
  T.push("", "—", "", f.titre.toUpperCase(), f.accroche);
  for (const s of S) {
    T.push("");
    if (s.t) T.push(s.t.toUpperCase());
    s.lines.forEach((l, i) => T.push(s.k === "texte" ? l : (s.k === "etapes" ? `${i + 1}. ` : s.k === "questions" ? "? " : s.k === "eviter" ? "✕ " : "- ") + l));
  }
  T.push("", "QUAND EN PARLER", f.aide);
  if (f.plus?.length) { T.push("", "POUR ALLER PLUS LOIN"); for (const x of f.plus) T.push("- " + x); }
  T.push("", "EN CAS DE BESOIN");
  for (const [n, d] of URGENCES) T.push(`- ${n} : ${d}`);
  for (const [n, c, d] of SOUTIENS) T.push(`- ${n} : ${c} (${d})`);
  T.push("", AVERTISSEMENT, "", FIN, "", pied);

  // html (mise en page en tableaux : seule façon fiable dans les messageries)
  const titre = (t, c) => (t ? `<div style="margin:0 0 8px;font-size:16px;font-weight:700;color:${c}">${esc(t)}</div>` : "");
  const bloc = (s, i) => {
    if (s.k === "texte") {
      const corps = s.lines.map(para).join("");
      if (!s.t) return `<div style="margin:0 0 4px">${corps}</div>`;
      if (i === 0) return `<div style="margin:18px 0 4px;padding:2px 0 2px 14px;border-left:4px solid #AE164E">${titre(s.t, "#AE164E")}${corps}</div>`;
      return `<div style="margin:18px 0 4px;padding:12px 16px;border-radius:14px;background:#EADCF0">${titre(s.t, "#7B206B")}<div style="margin:0 0 -10px">${corps}</div></div>`;
    }
    const [c, fond] = COUL[s.k] || COUL.liste;
    return `<div style="margin:20px 0 0">${titre(s.t, c)}` + s.lines.map((l, j) =>
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr><td style="background:${fond};border-radius:10px;padding:9px 12px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
      `<td width="30" valign="top" style="padding:1px 10px 0 0"><div style="width:22px;height:22px;line-height:22px;border-radius:11px;background:${c};color:#ffffff;text-align:center;font-size:12px;font-weight:700">${marque(s.k, j)}</div></td>` +
      `<td valign="top" style="font-size:15px;line-height:1.5;font-family:${FONT}">${esc(l)}</td></tr></table></td></tr></table>`).join("") + `</div>`;
  };
  const H =
    `<div style="background:#FDF5EB;padding:20px 8px"><div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;font-family:${FONT};color:#1F1217">` +
    `<div style="background:#75151F;color:#FDF5EB;padding:14px 26px;font-size:13px;letter-spacing:.18em;font-weight:600"><img src="https://www.capsule-paris8.fr/favicon.png" width="22" height="22" alt="" style="vertical-align:middle;margin:0 10px 0 0;border:0">CAPSULE · PARIS 8</div>` +
    `<div style="padding:24px 26px 26px">` +
    para(salut) + para(intro) + (mot ? `<div style="margin:0 0 14px;padding:12px 14px;border-left:3px solid #AE164E;background:#FDF5EB;font-size:15px;line-height:1.6;white-space:pre-wrap">${esc(mot)}</div>` : "") +
    `<div style="margin:22px -26px 0;padding:22px 26px;background:#F9DEE5"><span style="display:inline-block;padding:3px 12px;border-radius:99px;background:#ffffff;color:#AE164E;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase">${esc(f.theme)}</span>` +
    `<h2 style="margin:10px 0 6px;font-size:25px;line-height:1.2;color:#75151F">${esc(f.titre)}</h2><p style="margin:0;color:#5E4B55;font-size:15px;line-height:1.5">${esc(f.accroche)}</p></div>` +
    S.map(bloc).join("") +
    `<div style="margin:22px 0 0;padding:14px 16px;border-radius:14px;background:#F9DEE5"><b style="display:block;margin:0 0 4px;font-size:15px;color:#75151F">Quand en parler</b><span style="font-size:15px;line-height:1.55">${esc(f.aide)}</span></div>` +
    (f.plus?.length ? `<div style="margin:20px 0 0">${titre("Pour aller plus loin", "#AE164E")}<ul style="margin:0;padding-left:20px">${f.plus.map((x) => `<li style="margin:0 0 6px;font-size:15px;line-height:1.5">${esc(x)}</li>`).join("")}</ul></div>` : "") +
    `<div style="margin:22px 0 0;padding:16px 18px;border-radius:14px;background:#75151F;color:#FDF5EB"><div style="margin:0 0 10px;font-size:16px;font-weight:700;color:#ffffff">En cas de besoin</div>` +
    URGENCES.map(([n, d]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px"><tr><td style="background:#E30F1B;border-radius:10px;padding:8px 12px;color:#ffffff"><b style="font-size:20px;margin:0 10px 0 0">${esc(n)}</b><span style="font-size:13px">${esc(d)}</span></td></tr></table>`).join("") +
    SOUTIENS.map(([n, c, d]) => `<div style="margin:0 0 6px;font-size:14px;line-height:1.45"><b style="color:#ffffff">${esc(n)}</b> : ${esc(c)} <span style="opacity:.8">(${esc(d)})</span></div>`).join("") +
    `</div>` +
    `<p style="margin:18px 0 0;font-size:13px;color:#6B5861;line-height:1.5">${esc(AVERTISSEMENT)}</p>` +
    `<p style="margin:16px 0 0;font-size:15px">${esc(FIN)}</p>` +
    `</div><div style="background:#FDF5EB;padding:14px 26px;font-size:12px;color:#6B5861;line-height:1.5">${esc(pied)}</div></div></div>`;
  return { objet, text: T.join("\n"), html: H };
}

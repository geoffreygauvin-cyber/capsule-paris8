# Modifier les textes du site

1. Ouvrir `https://capsule-paris8.netlify.app/?edit`
2. Saisir le mot de passe (à demander aux responsables de CAPSULE).
3. Cliquer sur un texte (entouré de pointillés), le modifier.
4. Cliquer sur **Enregistrer** : le site public est mis à jour immédiatement.

Repères : `[[mot]]` met le mot en couleur, `**mot**` le met en gras.
Limites : on modifie les textes existants (pas les images ni la structure).

Technique : les textes enregistrés sont stockés dans Netlify Blobs (fonction `netlify/functions/contenu.mjs`) ; `contenu.json` est le contenu par défaut. Le mot de passe est la variable `EDIT_PASSWORD` dans Netlify.

# Demandes de contact

Le formulaire « Être recontacté·e » enregistre les demandes dans Netlify Blobs (`netlify/functions/demande.mjs`).
La page privée est `/gestion`. Comptes principaux (administrateurs) : variable Netlify `GESTION_COMPTES` (`compte:code,compte2:code2`, le premier est Geoffrey). Les autres comptes se créent depuis la page, bouton « Équipe » (stockés avec codes chiffrés). Secret de session : `SESSION_SECRET`. Statuts, attribution, rendez-vous, notes, export CSV, suppression.

# Planning des rendez-vous

Onglet « Calendrier » de `/gestion` : 3 salles (Salle 1 à 3), créneaux d'1 h de 9 h à 17 h, du lundi au mercredi (réglages dans `netlify/lib/rdv.mjs`).
Planifier = invitation par mail (fichier .ics, s'ajoute à l'agenda) + rappel automatique la veille (`netlify/functions/rappels.mjs`, tous les jours vers 17-18 h).
Mails : variables Netlify `MAIL_USER` (capsule-contact@gmail.com) et `MAIL_PASS` (mot de passe d'application Google). Flux d'agenda général : `/api/calendrier.ics?k=<CAL_TOKEN>`.

# Patients, séances et profils

Chaque rendez-vous passé se confirme depuis la plateforme (« Séance réalisée » ou « Absent·e ») : c'est ce qui alimente le décompte des séances par patient et par thérapeute. Onglet « Patients » : base des personnes accompagnées (fiche, historique, export CSV). Photo de profil : clic sur son nom en bas du menu. Les données sont dans Netlify Blobs (stores « demandes », « comptes », « profils »).

# Ressources

Onglet « Ressources » de `/gestion` : les comptes principaux ajoutent des fichiers (4 Mo maximum : PDF, Word, Excel, PowerPoint, image, texte) ou des liens, classés par catégorie (`CATS` dans `netlify/functions/gestion.mjs`). Tous les comptes peuvent les télécharger. Stockage : Netlify Blobs, store « ressources ».

# Messages

Onglet « Messages » de `/gestion` : envoi d'un mail à la main (aperçu avec les infos de la personne, modifiable avant l'envoi), modèles de texte (les 4 messages automatiques — confirmation, déplacement, rappel de la veille, annulation — et 4 modèles à la main ; modifiables par les comptes principaux, avec des champs `{{prenom}}`, `{{date}}`, `{{heure}}`, `{{salle}}`, `{{therapeute}}`…), et historique de tous les envois (les comptes principaux voient tout, les autres seulement les leurs). Textes par défaut : `netlify/lib/modeles.mjs`.

## Étude d'efficacité (comptes principaux)
Onglet « Efficacité » : indicateurs et graphiques calculés à partir des mesures saisies par les thérapeutes. Après chaque séance réalisée, la plateforme propose deux notes (0 à 10) : bien-être de la semaine écoulée (début de séance) et utilité de la séance (fin de séance). Elles se corrigent ensuite depuis la fiche patient (« modifier » / « + mesures »). En fin de suivi, la fiche patient permet de noter le changement perçu (1 à 7). Les mesures sont aussi dans les exports (séances, patients). Données descriptives, sans groupe de comparaison : à présenter comme telles.

## Plusieurs rendez-vous par personne, déplacement entre onglets
Une personne peut avoir plusieurs rendez-vous à venir (« Planifier un autre rendez-vous » depuis sa fiche, ou « + » dans le calendrier). Chaque rendez-vous est numéroté (RDV 1, 2, 3…, séances passées comprises). Si la personne a déjà un rendez-vous la même semaine (du lundi au dimanche), la plateforme demande confirmation (« Oui, c'est voulu ») et affiche un ⚠ dans la liste, le calendrier et la fiche. Le menu « Déplacer ⇄ » sur chaque ligne de la liste Demandes change l'onglet (statut) en un clic, sans toucher aux rendez-vous. Les anciennes fiches (un seul rendez-vous) sont converties automatiquement.

## Statuts de compte, emploi du temps et supervision
Trois statuts de compte (Équipe › « Statut du compte », modifiable ensuite dans la liste) :
- **Étudiant·e psy** : espace thérapeute (demandes, calendrier, patients, emploi du temps, ses supervisions, son activité, ressources, messages).
- **Superviseur·e** : espace superviseur (emploi du temps, supervision, calendrier en lecture, ressources). L'« Espace gestion » (supervision de toute l'équipe, activité équipe, efficacité, équipe) est réservé aux comptes admin. Aucune coordonnée de patient n'est transmise à ce compte, et il ne peut pas modifier les rendez-vous ni écrire aux patients.
- **Admin** : les deux espaces, et la gestion des comptes. Les comptes principaux (variable `GESTION_COMPTES`) sont toujours admin.
Onglet « Emploi du temps » : la semaine d'une personne (rendez-vous patients + supervisions) ; les admins et superviseurs peuvent choisir la personne. Onglet « Supervision » : les admins et superviseurs programment des séances (ponctuelles ou chaque semaine, jusqu'à 26 fois), choisissent superviseur·e, participant·es, lieu et durée, puis notent les présences après la séance ; les heures de supervision suivies sont comptées par étudiant·e. Un chevauchement (supervision, rendez-vous patient) est signalé ; un rendez-vous patient ne peut pas être placé pendant une supervision de la personne.


## Statuts de compte (mise à jour)

- Il n'y a plus que deux statuts : **Admin** (tout voir + espace gestion : comptes, suivi d'activité, exports, réunions d'équipe) et **Étudiant·e psy** (prise de rendez-vous, calendrier, patients, messages, ressources, ses supervisions et réunions).
- Le statut « superviseur » est supprimé : un ancien compte superviseur est désactivé et peut être supprimé dans Équipe. Le nom d'un·e superviseur·e est saisi librement sur chaque séance.
- Les étudiant·es programment eux-mêmes leurs supervisions et réunions d'équipe (elles s'ajoutent aux agendas des personnes invitées) ; ils ne modifient que les leurs.
- Les comptes « principaux » (variable Netlify GESTION_COMPTES) ne sont pas supprimables depuis le site. Seul geoffrey y figure désormais ; les autres comptes se créent dans Équipe.

## Logos des partenaires
Bandeau en bas du site : déposer les fichiers dans `img/partenaires/` sous les noms `cvec.png` (bloc complet Crous/CVEC, non modifié), `ars.png`, `paris8.png` (PNG fond transparent de préférence). Tant qu'un fichier manque, le nom s'affiche en texte. Liste et liens : variable `PART` dans `site.js`.

## Espace « Publications » (/gestion)
Page `gestion-com.js` : visuels réseaux (post carré, story) et supports A4 (affiche, fiche info). Tout est dessiné dans un canvas : aperçu, PNG et PDF viennent du même dessin. Modèles, couleurs et logos : constantes `PRE`, `TH`, `SRC` en haut du fichier. Les brouillons sont enregistrés dans le navigateur de chaque personne (pas sur le serveur). Le PDF contient une image haute définition de la page (texte non sélectionnable).
Export PowerPoint : bibliothèque PptxGenJS 4.0.1 (MIT) copiée dans `vendor-pptxgen.bundle.js`, chargée seulement au clic. Chaque texte, forme et image du visuel devient un élément modifiable.
Onglets de la page Publications : « Créer un visuel », « Nos pages » (liens du site et des réseaux, partagés par toute l'équipe, stockés dans Netlify Blobs, store `liens` ; chacun·e modifie ses liens, un admin tous) et « Chiffres clés » (KPI et graphiques calculés dans le navigateur à partir des demandes et séances).

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
- **Étudiant·e psy** : espace étudiant psychologue (demandes, calendrier, patients, emploi du temps, ses supervisions, son activité, ressources, messages).
- **Superviseur·e** : espace superviseur (emploi du temps, supervision, calendrier en lecture, ressources). L'« Espace admin » (supervision de toute l'équipe, activité équipe, efficacité, équipe) est réservé aux comptes admin. Aucune coordonnée de patient n'est transmise à ce compte, et il ne peut pas modifier les rendez-vous ni écrire aux patients.
- **Admin** : les deux espaces, et la gestion des comptes. Les comptes principaux (variable `GESTION_COMPTES`) sont toujours admin.
Onglet « Emploi du temps » : la semaine d'une personne (rendez-vous patients + supervisions) ; les admins et superviseurs peuvent choisir la personne. Onglet « Supervision » : les admins et superviseurs programment des séances (ponctuelles ou chaque semaine, jusqu'à 26 fois), choisissent superviseur·e, participant·es, lieu et durée, puis notent les présences après la séance ; les heures de supervision suivies sont comptées par étudiant·e. Un chevauchement (supervision, rendez-vous patient) est signalé ; un rendez-vous patient ne peut pas être placé pendant une supervision de la personne.


## Statuts de compte (mise à jour)

- Il n'y a plus que deux statuts : **Admin** (tout voir + espace admin : comptes, suivi d'activité, exports, réunions d'équipe) et **Étudiant·e psy** (prise de rendez-vous, calendrier, patients, messages, ressources, ses supervisions et réunions).
- Le statut « superviseur » est supprimé : un ancien compte superviseur est désactivé et peut être supprimé dans Équipe. Le nom d'un·e superviseur·e est saisi librement sur chaque séance.
- Les étudiant·es programment eux-mêmes leurs supervisions et réunions d'équipe (elles s'ajoutent aux agendas des personnes invitées) ; ils ne modifient que les leurs.
- Les comptes « principaux » (variable Netlify GESTION_COMPTES) ne sont pas supprimables depuis le site. Seul geoffrey y figure désormais ; les autres comptes se créent dans Équipe.

## Logos des partenaires
Bandeau en bas du site : déposer les fichiers dans `img/partenaires/` sous les noms `cvec.png` (bloc complet Crous/CVEC, non modifié), `ars.png`, `paris8.png` (PNG fond transparent de préférence). Tant qu'un fichier manque, le nom s'affiche en texte. Liste et liens : variable `PART` dans `site.js`.

## Espace « Publications » (/gestion)
Page `gestion-com.js` : visuels réseaux (post carré, story) et supports A4 (affiche, fiche info). Tout est dessiné dans un canvas : aperçu, PNG et PDF viennent du même dessin. Modèles, couleurs et logos : constantes `PRE`, `TH`, `SRC` en haut du fichier. Les brouillons sont enregistrés dans le navigateur de chaque personne (pas sur le serveur). Le PDF contient une image haute définition de la page (texte non sélectionnable).
Export PowerPoint : bibliothèque PptxGenJS 4.0.1 (MIT) copiée dans `vendor-pptxgen.bundle.js`, chargée seulement au clic. Chaque texte, forme et image du visuel devient un élément modifiable.
Onglets de la page Publications : « Créer un visuel », « Planning » et « Nos pages » (liens du site et des réseaux, partagés par toute l'équipe, stockés dans Netlify Blobs, store `liens` ; chacun·e modifie ses liens, un admin tous). Les chiffres de fonctionnement du service (demandes, séances, délai, satisfaction, graphiques) sont dans « Suivi d'activité » (fonction `drawEff` de gestion.html).
Onglet « Planning » : publications par réseau (LinkedIn, Instagram, site…) avec statut Idée → En attente de validation → Programmée (date + heure) → Publiée (avec lien). Stocké dans Netlify Blobs, store `publis` (un seul document JSON), actions `pub_list|pub_save|pub_del` dans `netlify/functions/gestion.mjs`. Rien n'est publié automatiquement : l'onglet sert à enregistrer, valider et rappeler (export agenda .ics). Une publication automatique demanderait une connexion aux API des réseaux ou un outil type Buffer.
Rappels : une publication non publiée dont la date est arrivée ou dépassée apparaît dans un encart « Publications à faire » sur l'Accueil (classée par réseau) et en pastille sur « Publications » dans le menu (module « rappels » de gestion-com.js). Le créateur de visuels enregistre directement dans le planning (réseau + date), il n'y a plus de brouillons locaux.

## Annonces de l'équipe (Accueil + page Gestion)
Les admins publient des annonces (titre, message, lien, date de fin, « important ») depuis l'Accueil ; les étudiant·es les voient en haut de leur Accueil avec une pastille sur « Accueil » dans le menu, et cliquent « C'est lu ». Les admins voient « Lu par X sur N » (modifier le titre ou le texte remet le compteur à zéro). Fichiers : `gestion-annonces.js`, actions `annonce_list|annonce_save|annonce_del|annonce_lu` dans `netlify/functions/gestion.mjs`, store Blobs `annonces`. Pas d'envoi de mail : l'annonce n'est vue qu'à l'ouverture de l'appli.
Archives des annonces : une annonce passe automatiquement en « Archives » à sa date de fin, ou 30 jours après sa publication/modification si elle n'a pas de date de fin (constante `JOURS` dans `gestion-annonces.js`) ; un admin peut aussi l'archiver à la main, la remettre en avant ou la supprimer. Les archives restent lisibles par tous. Au-delà de 60 annonces, la plus ancienne est supprimée.
Planning des publications : un onglet par plateforme (LinkedIn, Instagram, Site web, puis les autres réseaux qui ont des publications). Dans chacun : « Prêtes à publier » (avec date), « Idées » et « Publiées (archives) ». Une publication non publiée devient rouge la veille de sa date (fonction `urgent`, seuil J-1) ; même règle pour le rappel sur l'Accueil et la pastille du menu.

## Page « Gestion » (admins) — ex-« Supervisions & réunions »
Quatre onglets (chacun avec la même barre : filtres à gauche, bouton d'action à droite) : **Réunions & supervisions** (organiser une réunion d'équipe : elle s'ajoute à l'agenda des invités ; programmer les supervisions, noter les présences), **Annonces** (rédaction : date de début + durée d'affichage 1 jour à 1 mois, case « important » ; une annonce programmée n'est pas envoyée aux étudiants avant sa date, côté serveur) **Entretiens privés** (type `entretien` dans le store `supervisions` : étudiant·e, motif feedback/recadrage/point d'étape/autre, date, lieu, notes). Le motif, le titre et les notes d'un entretien ne sont jamais envoyés aux comptes non admin : l'étudiant·e voit seulement « Entretien individuel », la date et le lieu dans son agenda. Les entretiens ne comptent pas comme supervision ni dans les présences à saisir. Le quatrième onglet, **Juridique**, contient le règlement intérieur (voir plus bas).
Côté étudiant·es, les annonces en cours s'affichent dans un bandeau en haut de l'Accueil (framboise tant qu'il y en a de non lues).
Lien de visio : champ facultatif sur les réunions, supervisions et entretiens (champ `lien`, https uniquement). Bouton « Créer un lien Jitsi » (salle `meet.jit.si/CAPSULE-` + 18 caractères aléatoires, sans compte) ou « Créer avec Google Meet » (ouvre meet.google.com/new, on colle le lien). Le lien apparaît en « Rejoindre la visio » dans les cartes et dans l'agenda. Sur l'Accueil, les admins voient aussi le bandeau des annonces en cours (lecture seule, avec « Lu par X sur N » et un bouton « Gérer les annonces »).

## Envoyer les accès par mail (Équipe)
Bouton « Envoyer l'accès » sur chaque compte, ou « Envoyer les accès par mail » pour toute l'équipe : mail tout fait (adresse du site, identifiant, code, mode d'emploi selon le statut). Envoi direct via le compte Gmail du site (variables MAIL_USER / MAIL_PASS, les mêmes que pour les messages aux patients) ; sans cette configuration, « Ouvrir dans ma messagerie » (mailto) et « Copier le mail » restent disponibles. Le texte du mail est dans `mailAcces` (`netlify/functions/gestion.mjs`). Les adresses sont mémorisées dans le store Blobs `emails`. Actions `acces_list|acces_apercu|acces_mail`.
Mise en page du mail : le mail envoyé reprend la fiche d'utilisation en HTML (bandeau, cadres identifiant / code, étapes numérotées ; les admins ont une seconde partie). Une version texte brut accompagne toujours le HTML (et sert pour « Ouvrir dans ma messagerie » et « Copier »). Les étapes sont écrites à deux endroits à garder identiques : `MAIL_ET` / `MAIL_AD` dans `netlify/functions/gestion.mjs` et `ET` / `AD` dans `ficheHTML` de `gestion.html`. Le HTML est produit par `mailAccesHtml` ; `netlify/lib/mail.mjs` accepte un champ `html`. Pas de PDF en pièce jointe (le PDF reste via « Fiche PDF »).

## Titre personnalisé (profil)
Chaque personne peut changer le titre affiché sous son nom (fenêtre qui s'ouvre en cliquant sur son nom en bas du menu) : 40 caractères maximum, champ vide = titre par défaut (« Étudiant·e psy », « Administrateur·rice »…). Stocké avec la photo dans le store Blobs `profils` (champ `titre`), action `profil_titre` ; la liste renvoie `titres`.

## Onglet « Charte graphique » (/gestion, section Communication)
Visible par toute l'équipe (admins et étudiant·es). Page `gestion-charte.js` (vue `#v13` de gestion.html) : logos, couleurs (clic = copie du code HEX), typographie, trame de points, illustrations, ton, bannière LinkedIn. Pour changer une couleur ou un texte : modifier les tableaux `COUL`, `PAL` et les textes en haut de `gestion-charte.js`.
Les fichiers à télécharger sont dans le dossier `charte/` du dépôt : `Charte-graphique-CAPSULE.pdf`, `Logos-CAPSULE.zip` (SVG, PDF, PNG, profils, favicons), `banniere-linkedin-capsule.png`, `svg/` (logos vectoriels). Pour les remplacer, déposer un fichier du même nom. Le dossier est exclu des moteurs de recherche (netlify.toml).
Trame de points : classe `.pastel` (gestion.html) et `.point::after` (index.html) : points ronds de 1,5 px de rayon tous les 9 px, couleur de l'aplat à 36–42 % d'opacité, masque en diagonale depuis le coin haut droit.

## Onglet « Équipe » (organigramme et profils) + « Comptes »
Nouvel onglet **Équipe** (juste après Accueil, pour tout le monde) : organigramme à deux niveaux (Coordination = comptes admin ; puis Étudiant·es psychologues ; le compte Service technique est affiché à part, voir plus bas) et vue « Liste ». Chaque carte montre la photo, le prénom, le titre et la présentation de la personne. Les comptes désactivés n'apparaissent pas. Page `gestion-equipe.js` (vue `#v14`). L'ancien onglet admin « Équipe » (création des comptes, codes, envoi des accès) s'appelle maintenant **Comptes**.
Chacun·e modifie son titre, sa photo et sa **présentation** (240 caractères maximum) en cliquant sur son nom en bas du menu : action `profil_bio` (comme `profil_titre`), stockée dans le store Blobs `profils` (champ `bio`), renvoyée par `list` sous `bios`. Pour changer les niveaux de l'organigramme (par exemple ajouter un niveau « responsable de pôle »), modifier la fonction `draw` de `gestion-equipe.js`.

## Modèles PowerPoint
Deux modèles dans `charte/` : `CAPSULE-modele-etudiants.pptx` (10 diapositives) et `CAPSULE-modele-directions.pptx` (13 diapositives), téléchargeables depuis l'onglet « Charte graphique », dans le sous-onglet **Modèles PowerPoint** (en haut de la page, à côté de « Charte graphique »), avec un aperçu des diapositives (`charte/apercus/ppt-etudiants.jpg` et `ppt-directions.jpg`). Ils utilisent la police Poppins (à installer sur l'ordinateur, sinon PowerPoint la remplace), un thème aux couleurs de la charte et 7 mises en page (Titre, Section, Contenu, Deux colonnes, Titre seul, Message, Fin). Pour ajouter une diapositive : Accueil > Nouvelle diapositive, puis choisir la mise en page. Les chiffres et le graphique du modèle « directions » sont des exemples à remplacer.

**Deux versions de chaque modèle** (boutons dans l'onglet « Charte graphique ») : `…-vierge.pptx` = « texte à remplir » (textes guides du type « Titre de la diapositive », « Indicateur 1 », « Date 1 » ; les infos qui ne changent pas — adresse du site, mail, numéros d'urgence 3114 / 15 / 112, logos partenaires — restent) et la version « avec exemple », rédigée comme une vraie présentation. Les quatre fichiers sont dans `charte/`. Ils sont générés par un script (pptxgenjs) qui n'est pas dans le dépôt : pour changer un texte, ouvrir le .pptx et enregistrer sous le même nom dans `charte/`.

## Logo animé (onglet « Charte graphique »)
Section « Logo animé » : aperçu en boucle (muet) et téléchargement de `capsule-logo-anime-16x9.mp4` (1920 × 1080), `…-carre.mp4` (1080 × 1080), `…-story.mp4` (1080 × 1920) et `capsule-logo-anime.gif` (960 × 540), durée ≈ 6 s. Les images fixes affichées avant lecture sont dans `charte/apercus/`. Pour remplacer une vidéo, déposer un fichier du même nom (H.264, yuv420p, `-movflags +faststart` pour que l'aperçu démarre vite).

## Statut « Service technique » et interrupteur de mode
Compte avec le statut spécial **Service technique** (aujourd'hui : `violette`, liste `TECH` dans `netlify/functions/gestion.mjs`) :
- droits admin permanents, quel que soit le type de compte (compte principal ou compte créé dans l'onglet Comptes : le serveur force le rôle admin et l'annuaire des rôles) . Le statut ne se change pas dans l'onglet Comptes : l'action `compte_role` est refusée, la ligne affiche « Service technique » ;
- titre fixe « Service technique » (renvoyé dans `titres` par `list` ; `profil_titre` est refusé pour ce compte, le champ est grisé dans le profil) ;
- dans l'organigramme, bloc « Service technique · transversal » sous les étudiant·es ;
- un interrupteur **Mode : Étudiant psy | Admin** en haut du menu (visible seulement pour ce compte : `list` renvoie `technique: true`). « Étudiant psy » affiche la plateforme comme la voit un·e étudiant·e psychologue (menu et pages réduits, « Mon activité »…), « Admin » la montre en entier. C'est un changement d'affichage côté navigateur (choix mémorisé dans le navigateur) : les droits réels restent ceux d'un admin. Sur téléphone, le bouton « Passer en mode… » est dans la barre du haut.
Pour donner ce statut à quelqu'un d'autre, ajouter son nom de compte (en minuscules) à `TECH`.

## Parcours d'accueil des nouvelles recrues
Fichier `gestion-accueil.js` (étapes dans la liste `BASE` en tête de fichier ; l'étape « règlement » s'y ajoute toute seule dès que le règlement est publié) :
- les **étudiant·es psy** voient en haut de l'Accueil une carte « Bienvenue dans l'équipe » avec la checklist et une barre d'avancement ; elle disparaît quand toutes les étapes sont faites (6, ou 7 avec le règlement) (message de félicitations) ;
- 2 étapes sont constatées automatiquement (photo de profil, présentation) ; les 4 autres (charte, modèles PowerPoint, ressources, équipe) sont cochées par la personne, chaque étape ayant un bouton qui ouvre la bonne page (« Voir les modèles » ouvre l'onglet PowerPoint de la charte) ;
- les **admins** voient l'avancement de chaque étudiant·e en haut de l'onglet Équipe (étapes restantes, ancienneté du compte, barre de progression). Le compte Service technique et les admins n'ont pas de parcours ;
- stockage : Netlify Blobs, store `accueil` (une clé par compte, dates des étapes cochées) ; actions `accueil_get` / `accueil_set` dans `netlify/functions/gestion.mjs` (chacun·e ne modifie que son parcours). Pour ajouter une étape cochée à la main, l'ajouter à `BASE` et à la liste `MANUELS` du serveur.

## Règlement intérieur (Gestion > Juridique : rédiger, publier, suivre les signatures)
Tout se gère dans la page **Gestion > onglet « Juridique »** (admins uniquement), fichier `gestion-juridique.js`. Plus rien à modifier dans le code pour changer le texte.
- **Rédiger** : bouton « Modifier le texte » = éditeur (titre, introduction, articles ; une ligne = un paragraphe, une ligne qui commence par `- ` devient une puce ; monter / descendre / supprimer / ajouter un article ; aperçu). « Enregistrer le brouillon » garde le travail sans le montrer à l'équipe. Le texte de départ (13 articles, **projet à faire valider** par la coordination et les laboratoires) est dans `netlify/lib/reglement.mjs` ; il ne sert que de premier brouillon (« Rétablir le texte de départ »).
- **Publier** : tant que rien n'est publié, l'équipe ne voit rien (pas de signature possible, pas d'étape dans le parcours d'accueil). « Publier la version 1 » la première fois. Ensuite, chaque publication demande le type de changement : **changement important** = nouveau numéro de version, tout le monde doit relire et re-signer ; **correction mineure** = même numéro, les signatures restent valables (le texte exact signé par chacun·e reste archivé). « Retirer la publication » remet hors ligne sans effacer les signatures ; republier le même texte rend leurs signatures de nouveau valables.
- **Signature** (fichier `gestion-reglement.js`, côté étudiant·es et admins) : lecture jusqu'en bas (la case ne se débloque qu'à ce moment), « J'ai lu… », saisie du prénom et du nom, puis signature. La plateforme enregistre le nom saisi, la date, l'heure, la version et l'empreinte (SHA-256) du texte exact. C'est une signature électronique **simple** (preuve d'acceptation interne), pas une signature qualifiée. Le serveur refuse une signature si la version ou l'empreinte ne correspond plus au texte publié (cas où le texte vient d'être mis à jour).
- **Où l'équipe le trouve** : étape « Lire et signer le règlement intérieur » en tête du parcours d'accueil des étudiant·es psy (elle apparaît à la publication) ; bouton « Règlement intérieur » dans le profil ; carte de rappel sur l'Accueil des admins et du service technique tant qu'ils n'ont pas signé.
- **Registre (admins)** : liste de tous les comptes (signé le…, à re-signer, pas encore signé), barre d'avancement, export CSV, et pour chaque personne « Exemplaire signé » : le texte tel qu'il a été signé, avec la mention de signature, imprimable en PDF. « Versions publiées » (sous le registre) retrouve et imprime le texte de chaque version.
- **Stockage** : Netlify Blobs, store `reglement` (`brouillon` = texte en cours de rédaction, `cur` = version publiée, `meta` = dernier numéro et historique des publications, `t/<empreinte>` = texte exact de chaque version publiée, `s/<compte>` = dernière signature + historique). Actions `juridique_get`, `reglement_brouillon`, `reglement_brouillon_reset`, `reglement_pub`, `reglement_texte` (admins), `reglement_get`, `reglement_sign`, `reglement_copie` (chacun·e son exemplaire ; les admins celui de n'importe qui) dans `netlify/functions/gestion.mjs`.

## Fiches de prévention pour les patients (Ressources > « Fiches patients »)
- **13 fiches** d'une page : Mieux dormir, Apaiser l'anxiété, Quand le moral reste bas, Stress des partiels, Respirer pour se détendre, Quand les pensées tournent en boucle, Crise d'angoisse, Se mettre au travail, Se sentir seul·e, Prendre soin de son corps, Alcool et cannabis, Se parler avec bienveillance, Violences sexistes et sexuelles. Chaque fiche se **lit** dans la plateforme, s'**imprime** en une page A4 (bouton « Imprimer » : le navigateur propose aussi « Enregistrer au format PDF ») ou s'**envoie par mail** à une personne suivie, avec un mot personnel facultatif.
- **Le texte** est dans `netlify/lib/fiches.mjs` (une fiche = titre, accroche, blocs de paragraphes et de puces, « Quand en parler », numéros utiles propres à la fiche ; les numéros d'urgence communs sont en haut du fichier). Vouvoiement, ton simple et doux. Ajouter une fiche = ajouter un objet à `FICHES` : elle apparaît partout (liste, recherche, impression, mail) au déploiement suivant. Pour que l'impression tienne sur une page, viser environ 350 mots.
- **Mail** : mis en forme aux couleurs de CAPSULE, envoyé par le même service que l'onglet Messages ; l'envoi est noté dans Messages > Historique (« Fiche · Mieux dormir »). La personne peut répondre directement. Les étudiant·es voient et écrivent aux mêmes personnes que dans Messages.
- **À faire relire** par les superviseur·es avant usage : ce sont des repères généraux, avec numéros d'urgence (3114, 15, 112) et ressources du site. Vérifier de temps en temps que les numéros sont toujours valables.
- Code : `gestion-fiches.js` (affichage, lecture, impression, envoi) ; actions `fiches_list` et `fiche_envoyer` dans `netlify/functions/gestion.mjs`.

## Page de connexion (/gestion)
Page en deux volets (dans `gestion.html`, section `#login`, CSS « connexion » en haut du fichier) :
- à gauche, un panneau dégradé bordeaux → violet avec trame de points et le logo CAPSULE (qui se dessine à l'ouverture), volontairement sans texte ni illustration ;
- à droite, le formulaire (`#lform`, champs `#u` et `#p`, message d'erreur `#lerr`), œil pour afficher/masquer le code, indicateur d'attente sur le bouton, petite secousse si le code est faux, lien « Retour au site ».
Sur téléphone, le panneau de gauche se réduit à un bandeau (logo + nom) au-dessus du formulaire. Les animations sont coupées pour les personnes qui ont réglé « réduire les animations » sur leur appareil.

## Menu latéral (ordinateur)
Le menu est compacté par paliers de hauteur d'écran (≤ 900, 780, 680 et 620 px, `@media (max-height…)` en fin de feuille de style) pour que tout « Espace admin » reste visible sans défiler, même sur un petit écran ou avec le zoom du navigateur à 150 %. Sous 620 px, les titres de groupe deviennent de simples traits. Si l'écran est encore plus petit, le menu défile (barre de défilement visible) ; rien ne le recouvre.

## Photo de profil
L'envoi de la photo affiche maintenant un message à chaque étape (trop lourde, format non reconnu, enregistrée, échec), et le stockage des profils (`profils`) est lu en cohérence forte (`consistency: "strong"` dans `gestion.mjs`) pour qu'une photo enregistrée soit visible tout de suite après rechargement.

## Vocabulaire
L'espace de l'équipe étudiante s'appelle **Espace étudiant psychologue** (menu, mails d'accès, fiches PDF). Les autres espaces : Communication, Espace admin, et Service technique pour le compte concerné.

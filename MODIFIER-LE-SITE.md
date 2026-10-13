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

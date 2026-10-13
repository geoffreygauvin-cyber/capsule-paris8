# Modifier les textes du site

1. Ouvrir `https://capsule-paris8.netlify.app/?edit`
2. Saisir le mot de passe (à demander aux responsables de CAPSULE).
3. Cliquer sur un texte (entouré de pointillés), le modifier.
4. Cliquer sur **Enregistrer** : le site public est mis à jour immédiatement.

Repères : `[[mot]]` met le mot en couleur, `**mot**` le met en gras.
Limites : on modifie les textes existants (pas les images ni la structure).

Technique : les textes enregistrés sont stockés dans Netlify Blobs (fonction `netlify/functions/contenu.mjs`) ; `contenu.json` est le contenu par défaut. Le mot de passe est la variable `EDIT_PASSWORD` dans Netlify.

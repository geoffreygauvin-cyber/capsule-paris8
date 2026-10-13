# Modifier les textes du site CAPSULE

Tous les textes du site sont dans **un seul fichier : `contenu.js`**. On le modifie directement sur GitHub, sans rien installer. Le site se met à jour tout seul en 1 à 2 minutes.

## Corriger un texte

1. Ouvrez le dépôt sur GitHub et cliquez sur le fichier **`contenu.js`**.
2. Cliquez sur l'icône **crayon** (« Edit this file ») en haut à droite du fichier.
3. Repérez le texte (utilisez Ctrl+F pour le chercher) et modifiez-le **entre les guillemets**.
4. Cliquez sur **Commit changes**, puis encore sur **Commit changes**.
5. Attendez 1 à 2 minutes, puis rechargez le site (Ctrl+Maj+R).

## Les petites règles

- Gardez les guillemets `"` et les virgules à la fin des lignes.
- Mot en couleur : `[[entre doubles crochets]]`. Mot en gras : `**entre doubles astérisques**`.
- Retour à la ligne : `\n`.
- Les icônes (champ `icone`) possibles : euro, cap, campus, mail, chat, door, pin, clock, shield, moon, phone, heart, alert, cross.

## Les cas les plus fréquents

- **Changer l'adresse mail ou les horaires** : bloc `contact` en haut du fichier, et bloc `infosPratiques`.
- **Brancher un formulaire de rendez-vous** : dans `contact`, remplir `lienRendezVous` avec l'adresse du formulaire. Les boutons « Prendre rendez-vous » l'utiliseront automatiquement.
- **Ajouter une question à la FAQ** : dans `questions`, copier une ligne `{ q: "...", r: "..." },` et la coller en dessous.
- **Ajouter une ressource** : dans `ressources`, copier un bloc entre accolades `{ ... },` et modifier les textes.

## En cas d'erreur

Si le site s'affiche vide après une modification, c'est presque toujours un guillemet ou une virgule oublié. Sur GitHub, ouvrez `contenu.js`, cliquez sur **History**, puis sur la dernière version qui fonctionnait, et recopiez-la (ou demandez à la personne qui gère le site).

## Autres fichiers (à ne pas modifier sans besoin)

- `index.html` : l'apparence (couleurs, mise en page).
- `site.js` : construit la page à partir de `contenu.js`.
- `img/` : les illustrations. Pour en changer une, remplacez le fichier en gardant le même nom.

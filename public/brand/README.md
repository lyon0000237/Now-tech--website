# Marques et logotype

## `logo.svg` — le logotype NowTech Center

Attendu ici, pas encore livré. Le composant `src/components/brand/Logo.tsx`
dessine pour l'instant un losange vert et le mot-symbole en Poppins, ce qui tient
à 11px dans une barre sur téléphone mais n'est pas la marque.

Déposez le fichier sous `public/brand/logo.svg` (vectoriel de préférence, sinon
`logo.png` à 512px de côté minimum, fond transparent) et signalez-le : le
composant le prendra à la place du dessin, et le favicon suivra.

Ce que le fichier doit contenir : le disque vert, le losange blanc et
« NOW TECH ». Rien d'autre, pas de marge, pas d'ombre.

## `public/brands/` — les marques distribuées

Vingt logotypes constructeurs, téléchargés par `scripts/fetch-brand-marks.mjs`
depuis Simple Icons et servis depuis notre origine. Voir le script pour la
licence et pour la liste.

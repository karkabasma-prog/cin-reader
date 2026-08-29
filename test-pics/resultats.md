# Résultats des tests — Lecture automatisée de CIN

Ce document présente les résultats obtenus sur un jeu de 6 images fictives, couvrant à la fois des cas favorables et des cas volontairement dégradés, afin de vérifier la fiabilité et la robustesse de l'application.

Toutes les images utilisées sont des **specimens fictifs** (mention "Specimen" visible sur les CIN), ou des images sans rapport avec une pièce d'identité. Aucune donnée personnelle réelle n'a été utilisée.

---

## 1. `image-nette.png` — CIN nette et bien cadrée

Cas de référence : image claire, bien éclairée, sans obstruction.

**Résultat obtenu :**
```json
{
  "nom": "EL ALAMI",
  "prenom": "ZAINEB",
  "date_naissance": "05.12.1983",
  "numero_cin": "U1234567",
  "date_fin_validite": "22.07.2029",
  "warnings": []
}
```

**Analyse :** les 5 champs sont extraits correctement, sans avertissement de cohérence.

---

## 2. `image-inclinee.jpg` — CIN inclinée avec un champ partiellement coupé

Photo prise en angle, posée sur une table, avec la date de fin de validité partiellement hors cadre (`22/` seulement visible).

**Résultat obtenu :**
```json
{
  "nom": "EL ALAMI",
  "prenom": "ZAINEB",
  "date_naissance": "05.12.1983",
  "numero_cin": "U1234567",
  "date_fin_validite": null,
  "warnings": []
}
```

**Analyse :** les champs clairement visibles restent correctement lus malgré l'inclinaison. Le champ partiellement coupé est honnêtement signalé comme non lisible (`null`), sans tentative d'invention — comportement attendu par l'énoncé.

---

## 3. `image-floue 1.jpg` — CIN avec flou léger

Image dégradée par une réduction puis un agrandissement (simulation d'un flou de mise au point léger).

**Résultat obtenu :**
```json
{
  "nom": "EL ALAMI",
  "prenom": "ZAINEB",
  "date_naissance": "05.12.1983",
  "numero_cin": "U1234567",
  "date_fin_validite": "22.07.2029",
  "warnings": []
}
```

**Analyse :** malgré le flou, tous les champs restent lisibles et sont extraits correctement.

---

## 4. `image-floue 2.jpg` — CIN avec flou plus marqué

Même technique que le test précédent, avec un flou plus prononcé.

**Résultat obtenu :**
```json
{
  "nom": "EL ALAMI",
  "prenom": "ZAINEB",
  "date_naissance": "05.12.1983",
  "numero_cin": "U1234567",
  "date_fin_validite": "22.07.2029",
  "warnings": []
}
```

**Analyse :** l'extraction reste fiable même avec un flou plus fort. Le modèle de vision utilisé se montre robuste sur ce type de dégradation.

---

## 5. `image-dessin.jpg` — Image non pertinente (dessin)

Test de rejet : image d'un dessin, sans aucun rapport avec une CIN.

**Résultat obtenu :**
```json
{
  "nom": null,
  "prenom": null,
  "date_naissance": null,
  "numero_cin": null,
  "date_fin_validite": null,
  "warnings": []
}
```

**Analyse :** aucune donnée n'est inventée. Le système reconnaît qu'il ne s'agit pas d'une CIN et retourne `null` pour tous les champs, conformément à la consigne du prompt.

---

## 6. `image-carte bancaire.jpg` — Document non pertinent (carte bancaire)

Test de rejet plus subtil : un vrai document contenant du texte et une mise en page de carte, mais qui n'est pas une CIN.

**Résultat obtenu :**
```json
{
  "nom": null,
  "prenom": null,
  "date_naissance": null,
  "numero_cin": null,
  "date_fin_validite": null,
  "warnings": []
}
```

**Analyse :** le système distingue correctement un document de type "carte" d'une CIN marocaine, même si les deux partagent une mise en page visuellement proche (photo, texte, logo).

---

## Synthèse

| Test | Type de cas | Champs lus correctement | Comportement conforme |
|---|---|---|---|
| 1 | CIN nette | 5/5 | ✅ |
| 2 | CIN inclinée, champ coupé | 4/5 (1 `null` justifié) | ✅ |
| 3 | CIN floue (léger) | 5/5 | ✅ |
| 4 | CIN floue (marqué) | 5/5 | ✅ |
| 5 | Non-CIN (dessin) | 0/5 (`null` attendu) | ✅ |
| 6 | Non-CIN (carte bancaire) | 0/5 (`null` attendu) | ✅ |

**Taux de comportement conforme : 6/6 (100 %).**

Sur l'ensemble des cas testés, l'application n'a jamais inventé de donnée non lisible et a systématiquement retourné `null` lorsque l'information n'était pas fiable à extraire. Les cas de dégradation modérée (flou, inclinaison) n'empêchent pas une lecture correcte des champs réellement visibles.

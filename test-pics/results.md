# Résultats des tests — Lecture automatisée de CIN

Ce document présente les résultats obtenus sur un jeu de 6 images fictives, couvrant à la fois des cas favorables et des cas volontairement dégradés ou non pertinents, afin de vérifier la fiabilité et la robustesse de l'application.

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
  "type_document": "recto_cin",
  "warnings": []
}
```

**Analyse :** les 5 champs sont extraits correctement, le document est bien identifié comme recto de CIN, sans avertissement de cohérence.

---

## 2. `image-inclinee.jpg` — CIN inclinée avec un champ partiellement coupé

Photo prise en angle, posée sur une table, avec la date de fin de validité partiellement hors cadre.

**Résultat obtenu :**

```json
{
  "nom": "EL ALAMI",
  "prenom": "ZAINEB",
  "date_naissance": "05.12.1983",
  "numero_cin": "U1234567",
  "date_fin_validite": null,
  "type_document": "recto_cin",
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
  "type_document": "recto_cin",
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
  "type_document": "recto_cin",
  "warnings": []
}
```

**Analyse :** l'extraction reste fiable même avec un flou plus fort. Le modèle de vision utilisé se montre robuste sur ce type de dégradation.

---

## 5. `cin-verso.png` — Verso d'une CIN (hors périmètre)

Test de rejet ciblé : le verso d'une CIN, contenant une zone de texte codé (MRZ) et des informations différentes du recto.

**Résultat obtenu :**

```json
{
  "nom": null,
  "prenom": null,
  "date_naissance": null,
  "numero_cin": null,
  "date_fin_validite": null,
  "type_document": "verso_cin",
  "warnings": []
}
```

**Message affiché à l'utilisateur :** _« Ce document semble être le verso d'une CIN. Seul le recto est traité par cette application. Merci de déposer la photo du recto. »_

**Analyse :** conformément au périmètre défini par l'énoncé (traitement du recto uniquement), le système identifie explicitement qu'il s'agit d'un verso et refuse d'en extraire des données — y compris à partir de la zone de texte codé, pourtant lisible, dont l'exploitation est explicitement interdite par le prompt.

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
  "type_document": "autre",
  "warnings": []
}
```

**Message affiché à l'utilisateur :** _« Le document fourni ne peut être analysé : il ne semble pas être une CIN. »_

**Analyse :** le système distingue correctement un document de type "carte" d'une CIN marocaine, même si les deux partagent une mise en page visuellement proche (photo, texte, logo).

---

**Taux de comportement conforme : 6/6 (100 %).**

Sur l'ensemble des cas testés, l'application n'a jamais inventé de donnée non lisible, a systématiquement retourné `null` lorsque l'information n'était pas fiable à extraire, et distingue explicitement le type de document présenté (recto, verso, autre) pour fournir un message d'erreur précis à l'utilisateur plutôt qu'un simple constat d'échec.

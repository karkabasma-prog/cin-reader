# CIN Reader — Lecture automatisée de CIN marocaine

Application web qui lit le recto d'une carte d'identité nationale (CIN) marocaine à partir d'une photo, et en extrait 5 informations structurées : nom, prénom, date de naissance, numéro de CIN, date de fin de validité.

Seule la partie en caractères latins est traitée. L'arabe et le verso de la carte sont hors périmètre.

⚠️ **Aucune vraie pièce d'identité n'est utilisée dans ce projet.** Toutes les images de test sont des specimens fictifs (mention "Specimen" visible), fabriquées uniquement pour cette démonstration.

---

## Stack technique

- **Frontend** : React + TypeScript (Vite)
- **Backend** : Node.js + TypeScript (Express)
- **IA de vision** : modèle multimodal gratuit
- **Conteneurisation** : Docker + Docker Compose

---

## Fonctionnement général

1. L'utilisateur dépose une photo du recto d'une CIN sur le frontend (glisser-déposer ou sélection de fichier)
2. L'image est envoyée au backend via une requête `multipart/form-data`
3. Le backend transmet l'image à l'IA avec un prompt structuré, qui contraint la réponse à un format JSON précis
4. Une validation de cohérence indépendante est appliquée (format du numéro de CIN, plausibilité des dates)
5. Le résultat est renvoyé au frontend et affiché, champ par champ

Si un champ n'est pas lisible sur l'image, il est renvoyé comme `null` plutôt que d'être deviné. Si l'image n'est pas une CIN, tous les champs sont `null`.

---

## Prérequis

- [Node.js](https://nodejs.org/) (version 18 ou plus récente) et npm
- _(optionnel)_ Docker Desktop, pour lancer le projet conteneurisé
- Une clé API pour le modèle de vision utilisé, gratuite et sans carte bancaire

---

## Installation et lancement

### 1. Cloner le dépôt

```bash
git clone https://github.com/karkabasma-prog/cin-reader.git
cd cin-reader
```

### 2. Configurer le backend

```bash
cd backend
npm install
```

Créer un fichier `.env` dans le dossier `backend/`, contenant votre clé API :

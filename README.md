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

Lancer le serveur backend :

```bash
npm run dev
```

Le backend démarre sur **http://localhost:3001**.

### 3. Configurer le frontend

Dans un **second terminal** :

```bash
cd frontend
npm install
npm run dev
```

Le frontend démarre sur **http://localhost:5173**.

### 4. Utiliser l'application

Ouvrir **http://localhost:5173**, déposer une image de CIN (specimen fictif), et cliquer sur "Analyser le document".

---

## Installation et lancement — via Docker

Une fois le fichier `backend/.env` créé (voir ci-dessus), à la racine du projet :

```bash
docker compose up --build
```

Cette commande construit et démarre les deux services (frontend servi par Nginx, backend Node.js), accessibles respectivement sur `http://localhost:5173` et `http://localhost:3001`.

---

## Structure du projet

cin-reader/
├── backend/
│ ├── src/
│ │ ├── index.ts # serveur Express, route /analyze, gestion des erreurs
│ │ ├── ai-service.ts # appel à l'IA, prompt structuré, retry automatique
│ │ └── validation.ts # validation de cohérence indépendante de l'IA
│ ├── Dockerfile
│ └── .env # clé API (non versionné)
├── frontend/
│ ├── src/
│ │ └── App.tsx # interface d'upload et d'affichage des résultats
│ └── Dockerfile
├── test-pics/
│ ├── _.jpg / _.png # jeu d'images fictives de test
│ └── resultats.md # résultats obtenus sur chaque image
├── docker-compose.yml
└── README.md

---

## Gestion des erreurs et robustesse

L'application gère explicitement les cas suivants sans jamais planter :

- Aucun fichier envoyé, ou fichier vide (0 octet)
- Fichier envoyé qui n'est pas une image
- Fichier trop volumineux (limite fixée à 10 Mo)
- Image qui n'est pas une CIN marocaine (retourne `null` sur tous les champs)
- Champ partiellement visible ou illisible (retourne `null` pour ce champ précisément, sans invention)
- Erreur temporaire de l'API (quota, surcharge) : nouvelle tentative automatique avec délai croissant
- Échec définitif de l'appel à l'IA (message d'erreur clair, service toujours disponible)

Le détail des tests effectués et leurs résultats sont disponibles dans [`test-pics/resultats.md`](./test-pics/resultats.md).

---

## Limites connues

- Seul le recto de la CIN est traité ; le verso et le texte en arabe sont hors périmètre
- La validation de cohérence est une vérification de bon sens (format, plausibilité des dates) et ne garantit pas l'exactitude des données lues
- Le palier gratuit du modèle d'IA est limité en nombre de requêtes journalières

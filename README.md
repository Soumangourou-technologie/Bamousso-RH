# Bamousso RH - Le Logiciel RH pour les Entreprises Africaines

Bamousso RH est une solution SaaS (Software as a Service) complète de gestion des ressources humaines, conçue pour répondre aux besoins spécifiques des entreprises en Afrique. L'application est construite sur une architecture moderne et performante, séparant le backend (API) et le frontend (client).

## ✨ Stack Technique

Le projet est organisé en monorepo avec les deux principaux composants :

### 🚀 Backend (`/server`)

- **Framework** : Node.js avec Express.js
- **Langage** : TypeScript
- **Base de Données** : PostgreSQL
- **ORM** : Prisma
- **Authentification** : JWT (JSON Web Tokens) avec hachage de mot de passe via Bcrypt
- **Validation** : Zod
- **Gestion des Fichiers** : Multer pour la réception, Supabase Storage pour le stockage

### 🎨 Frontend (`/client`)

- **Framework** : React
- **Outil de Build** : Vite
- **Langage** : TypeScript
- **Style** : Tailwind CSS & Shadcn/UI pour les composants
- **Routing** : React Router
- **Gestion d'état & Requêtes** : React Query (TanStack Query)
- **Graphiques** : Recharts

## 🏁 Démarrage Rapide (Développement Local)

Suivez ces étapes pour lancer le projet sur votre machine.

### Prérequis

- Node.js (version 18+ recommandée)
- npm ou yarn
- Une base de données PostgreSQL (vous pouvez en obtenir une gratuitement sur [Supabase](https://supabase.com))

### 1. Cloner le Projet

```bash
git clone https://github.com/geek225/Bamousso-RH.git
cd Bamousso-RH
```

### 2. Configurer le Backend (`/server`)

1.  **Naviguer vers le dossier du serveur :**
    ```bash
    cd server
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```

3.  **Créer le fichier d'environnement :**
    Créez un fichier `.env` à la racine de `/server` et remplissez-le avec vos clés.

4.  **Lancer la migration de la base de données :**
    Cette commande va créer ou mettre à jour les tables de votre base de données selon le schéma Prisma.
    ```bash
    npx prisma migrate dev
    ```

5.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```
    Le serveur sera disponible sur `http://localhost:3001`.

### 3. Configurer le Frontend (`/client`)

1.  **Ouvrir un nouveau terminal** et naviguer vers le dossier du client :
    ```bash
    cd client
    ```

2.  **Installer les dépendances :**
    ```bash
    npm install
    ```

3.  **Créer le fichier d'environnement :**
    Créez un fichier `.env` à la racine de `/client` et remplissez-le avec vos clés Supabase (pour les fonctionnalités temps réel).

4.  **Lancer le client de développement :**
    ```bash
    npm run dev
    ```
    L'application sera disponible sur `http://localhost:5173`.

## 🔑 Variables d'Environnement

Pour que l'application fonctionne, vous devez configurer les variables d'environnement suivantes.

### Fichier `.env` du **serveur**

```
# URL de connexion à votre base de données PostgreSQL
# (Utilisez l'URL du "Connection Pooler" de Supabase pour Vercel/production)
DATABASE_URL="..."

# URL de votre projet Supabase
SUPABASE_URL="..."

# Clé publique de votre projet Supabase
SUPABASE_ANON_KEY="..."

# Clé de service (secrète) de votre projet Supabase (pour les uploads)
SUPABASE_SERVICE_KEY="..."

# Secret pour signer les jetons JWT
JWT_SECRET="..."

# URL du frontend (pour les liens dans les emails, etc.)
FRONTEND_URL="http://localhost:5173"
```

### Fichier `.env` du **client**

```
# URL de votre projet Supabase (pour les notifications temps réel)
VITE_SUPABASE_URL="..."

# Clé publique de votre projet Supabase
VITE_SUPABASE_ANON_KEY="..."
```

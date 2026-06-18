# Ynov CI/CD - Projet Final

Ce projet contient une application complète avec un backend en Node.js (Express), un frontend en React, et une base de données PostgreSQL. Le tout est orchestré avec Docker Compose.

---

## 🚀 Procédure de mise à jour après modification

Dès que vous effectuez une modification dans le code source (backend ou frontend) et que vous souhaitez mettre à jour l'application ou valider vos changements, suivez les commandes ci-dessous :

### 1. Reconstruire et redémarrer l'environnement Docker local
Pour appliquer vos modifications de code dans les conteneurs Docker locaux :
```bash
# Arrêter les conteneurs existants et reconstruire les images avec les modifications
docker compose down
docker compose up -d --build
```

### 2. Exécuter les tests unitaires
Lancer les tests pour valider vos modifications avant de build/pousser vos packages :

* **Backend :**
  ```bash
  cd backend && npm test
  ```

* **Frontend :**
  ```bash
  cd frontend && npm test
  ```

---

## 📦 Publication des packages sur GHCR (GitHub Container Registry)

Si vous souhaitez compiler et publier manuellement les nouvelles versions des images Docker (packages) sur **GHCR**, suivez cette procédure :

### 1. Connexion à GHCR (Authentification)
Vous devez générer un **Personal Access Token (PAT)** avec au moins les permissions `write:packages` et `read:packages`. Connectez-vous ensuite via votre terminal :

```bash
# Remplacez <VOTRE_USERNAME_GITHUB> par votre identifiant GitHub
# et collez votre token PAT lorsqu'on vous le demande
docker login ghcr.io -u <VOTRE_USERNAME_GITHUB>
```

### 2. Build et Tag des images
Compilez localement vos images Docker en les taggant spécifiquement pour GHCR (remplacez `<username>` par votre nom d'utilisateur GitHub en minuscules) :

* **Backend :**
  ```bash
  # Image avec tag versionné
  docker build -t ghcr.io/<username>/ynov-cicd-final-backend:1.0.0 ./backend
  
  # Image avec tag latest
  docker build -t ghcr.io/<username>/ynov-cicd-final-backend:latest ./backend
  ```

* **Frontend :**
  ```bash
  # Image avec tag versionné
  docker build -t ghcr.io/<username>/ynov-cicd-final-frontend:1.0.0 ./frontend
  
  # Image avec tag latest
  docker build -t ghcr.io/<username>/ynov-cicd-final-frontend:latest ./frontend
  ```

### 3. Push des packages sur GHCR
Envoyez les images créées vers le registre GitHub Container Registry :

* **Backend :**
  ```bash
  docker push ghcr.io/<username>/ynov-cicd-final-backend:1.0.0
  docker push ghcr.io/<username>/ynov-cicd-final-backend:latest
  ```

* **Frontend :**
  ```bash
  docker push ghcr.io/<username>/ynov-cicd-final-frontend:1.0.0
  docker push ghcr.io/<username>/ynov-cicd-final-frontend:latest
  ```

---

## 🤖 Automatisation CI/CD (Optionnel)
Pour automatiser la mise à jour des packages GHCR à chaque `push` ou `pull request` sur la branche `main`, vous pouvez configurer un workflow GitHub Actions sous `.github/workflows/deploy.yml` utilisant `docker/metadata-action` et `docker/build-push-action`.

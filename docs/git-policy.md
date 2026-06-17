# Politique Git et Quality Gate

## Branches

- `main` : branche production. Chaque push déclenche le push des images et le déploiement externe.
- `develop` : branche d'intégration. Elle valide les changements avant promotion vers `main`.
- `feature/*`, `fix/*`, `ci/*`, `docs/*` : branches de travail.

## Pull requests

Chaque changement applicatif ou CI/CD passe par une pull request vers `develop` ou `main`.

Critères de validation :

1. conventions de commit valides ;
2. scan de secrets vert ;
3. tests backend et frontend verts ;
4. couverture supérieure aux seuils configurés ;
5. build React de production valide ;
6. images Docker buildées ;
7. scans Trivy critiques verts.

## Conventions de commit

Format attendu :

```text
type(scope): subject
```

Types acceptés :

- `feat` : nouvelle fonctionnalité ;
- `fix` : correction ;
- `test` : ajout ou correction de tests ;
- `ci` : pipeline, registry, déploiement ;
- `docs` : documentation ;
- `refactor` : restructuration interne ;
- `build` : dépendances, Dockerfile, packaging ;
- `chore` : maintenance courante.

Exemples :

```text
feat(api): add health endpoint
fix(docker): expose frontend on host port 8080
ci(actions): add docker image scan
```

## Protection de branche à configurer dans GitHub

Dans `Settings > Branches > Branch protection rules`, créer une règle pour `main` :

- pull request obligatoire avant merge ;
- conversation résolue avant merge ;
- status checks requis : `Stage 1 - Quality gate`, `Stage 2 - Automated tests and coverage`, `Stage 3 - Docker build and image scan` ;
- historique linéaire recommandé ;
- push direct réservé aux mainteneurs.

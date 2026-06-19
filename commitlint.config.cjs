// Convention de commits (Conventional Commits) verifiee par le Stage 1 (quality gate).
// Exemples valides : "feat: ajoute le scan Trivy", "fix(frontend): corrige l'URL API".
// Types acceptes : feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
module.exports = {
  extends: ['@commitlint/config-conventional'],
};

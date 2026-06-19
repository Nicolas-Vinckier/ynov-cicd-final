// Convention de commits (Conventional Commits) verifiee par le Stage 1 (quality gate).
// Exemples valides : "feat: ajoute le scan Trivy", "fix(frontend): corrige l'URL API".
// Types acceptes : feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // On ne verifie pas les commits de merge (generes automatiquement par git).
  // Par defaut commitlint ignore "Merge ..." (anglais) ; on ajoute "Fusion ..." (francais).
  ignores: [
    (message) => /^Merge /.test(message) || /^Fusion /.test(message),
  ],
};

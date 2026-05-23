# 🚨 RAPPEL CRITIQUE POUR LES DÉPLOIEMENTS VERCEL 🚨

**NE JAMAIS OUBLIER :**
Lors de chaque `git commit` dans ce projet, l'adresse email de l'auteur **DOIT ABSOLUMENT ÊTRE** :
👉 `llateamd@gmail.com`

**POURQUOI ?**
Le projet est déployé sur Vercel avec un plan "Hobby" (gratuit). Si Vercel détecte un commit provenant d'une autre adresse email (considérée comme un collaborateur externe), **le déploiement sera immédiatement bloqué**.

**SOLUTION AUTOMATIQUE MISE EN PLACE :**
La configuration locale du dépôt a été mise à jour avec :
`git config user.email "llateamd@gmail.com"`
`git config user.name "Kévin Stéphane Assamoi"`

*(Note à moi-même : Toujours vérifier cette configuration avant de push !)*

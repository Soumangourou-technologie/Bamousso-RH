
<RULE[project_roadmap_payment]>
**Roadmap Note - Payment Aggregator Migration:**
Be aware that the current payment aggregator (GeniusPay) is temporary and will be replaced by a simpler, more secure aggregator in the future.
Keep this in mind if working on payment-related features, and be prepared to assist the user with the migration when requested.
</RULE[project_roadmap_payment]>

<RULE[github_push_checks]>
Avant chaque push vers GitHub, effectue obligatoirement une vérification complète du projet.

1. Vérifie la section Problems de l’IDE ainsi que les erreurs de compilation, TypeScript, lint et build.
2. S’il existe au moins une erreur réelle, même mineure, n’effectue pas le push. Analyse sa cause, corrige-la, puis relance automatiquement les vérifications.
3. Si une erreur semble provenir d’un ancien diagnostic, d’un cache ou d’un état obsolète de l’IDE, actualise automatiquement et silencieusement les diagnostics en arrière-plan, puis vérifie à nouveau la section Problems.
4. Ne modifie pas le code uniquement pour masquer une erreur. Vérifie d’abord si elle est réelle ou obsolète.
5. Exécute les commandes de validation réellement disponibles dans le projet, par exemple le type-check, le lint, les tests et le build. Ne suppose pas qu’une commande existe : vérifie d’abord les scripts du projet.
6. Le push vers GitHub est autorisé uniquement lorsque toutes les vérifications nécessaires réussissent et que la section Problems ne contient plus aucune erreur réelle.
7. Après chaque correction automatique, vérifie que la correction n’a pas créé de régression dans une autre partie du projet.
8. Si une erreur ne peut pas être corrigée avec certitude sans risque pour le projet, bloque le push et explique-moi clairement le problème avant toute action supplémentaire.

Règle absolue : zéro erreur réelle avant tout push GitHub. Les diagnostics obsolètes doivent être rafraîchis et revalidés avant de modifier le code.
</RULE[github_push_checks]>

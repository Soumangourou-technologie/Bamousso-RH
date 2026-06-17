# Journal des Modifications (Changelog)

## Fix (23 Mai 2026) : Gestion des employés supplémentaires et affichage du tableau de bord

### 1. Affichage du Quota d'Employés (Frontend)
- **Fichiers modifiés :** `client/src/pages/DashboardAdmin.tsx`, `client/src/pages/Settings.tsx`
- **Description du problème :** Le tableau de bord de l'administrateur affichait toujours la limite de base de la formule (par exemple, 5 pour FITINI), ignorant les employés supplémentaires achetés lors de l'inscription.
- **Solution apportée :** Remplacement de l'utilisation directe de `PLAN_MAX_EMPLOYEES[plan]` par l'appel à la fonction `maxEmployees()` issue du hook `usePlan.ts`. Cette fonction calcule dynamiquement `base + extraEmployees`.

### 2. Persistance des Employés Supplémentaires (Backend)
- **Fichiers modifiés :** `server/src/controllers/payment.controller.ts`
- **Description du problème :** Si GeniusPay n'envoyait pas (ou omettait) l'objet `metadata` contenant le nombre d'employés supplémentaires (`extraEmployees`) après validation d'un paiement, le backend écrasait la valeur en base de données avec `0`.
- **Solution apportée :** Le contrôleur de paiement vérifie désormais si `metadata.extraEmployees` est défini avant de le mettre à jour. Sinon, il conserve précieusement la valeur initialement enregistrée lors de la création du compte.

### 3. Cohérence du Statut lors de la Création (Backend)
- **Fichiers modifiés :** `server/src/controllers/auth.controller.ts`
- **Description du problème :** À l'inscription, avant même la tentative de paiement, le statut de l'abonnement était défini sur `PAST_DUE` (En retard de paiement), ce qui pouvait prêter à confusion dans la base de données. De plus, la donnée `extraEmployees` n'était pas renvoyée par l'API après l'inscription.
- **Solution apportée :** Changement du statut initial en `PENDING` (En attente de paiement). Ajout de la propriété `extraEmployees` dans l'objet de réponse renvoyé au frontend pour que le contexte soit exact dès la connexion initiale.

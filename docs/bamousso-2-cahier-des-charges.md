# Bamousso 2.0 — Cahier des charges

**Porteur** Soumangourou Technologies

**Marché initial proposé** Côte d’Ivoire
**Statut** Version de cadrage, 10 novembre 2026

## Objectif et publics

Ouvrir Bamousso aux jeunes, chercheurs d’emploi, commerçantes, e-commerçants, indépendants et entreprises. Le parcours public s’articule autour de quatre entrées. Je veux me former, je cherche un emploi, je recrute et je cherche un fournisseur. Le compte entreprise continue de donner accès à la gestion RH, au pointage, au suivi commercial et aux outils existants selon les droits et l’abonnement.

| Rôle | Accès principal |
| --- | --- |
| Visiteur | Recherche de fournisseurs publiés, actualités et offres publiques |
| Particulier | Profil, formation, CV, candidatures, alertes et missions |
| Entreprise | Fiche fournisseur, catalogue, commandes, devis, recrutements et visibilité |
| Administrateur de plateforme | Modération, signalements, gestion des catégories et contrôle des publications |

## Annuaire Pro et échanges commerciaux

- Une fiche fournisseur est rattachée à chaque entreprise, y compris les comptes existants. Elle se prépare depuis le tableau de bord. Le responsable décide de la publier et renseigne des coordonnées professionnelles destinées à l’annuaire.
- La recherche combine nom, activité, ville et, avec le catalogue publié, nom des produits ou services. La fiche présente adresse, téléphone, e-mail et catalogue. Le fournisseur peut corriger ou retirer la fiche.
- L’entreprise sélectionne les produits de son catalogue interne qu’elle souhaite afficher et ajoute des prestations. Elle renseigne images, description, prix en FCFA ou « Sur devis », disponibilité et conditions de livraison ou de retrait.
- Commande directe. L’acheteur choisit une quantité, vérifie le total et transmet la commande au fournisseur. Le fournisseur confirme disponibilité et délai, ou décline la demande. Les deux parties suivent les statuts.
- Cotation. L’acheteur décrit le besoin, la quantité, le lieu et le délai. Le fournisseur envoie un devis détaillé avec durée de validité. L’acheteur peut le refuser ou l’accepter pour générer une seule commande à partir de la version acceptée.
- Les prix, quantités et conditions convenues sont conservés dans l’historique de commande. Les deux entreprises participantes et leurs collaborateurs autorisés peuvent accéder au dossier. Le paiement des commandes et ses conditions restent à arbitrer.

## Bamousso Emploi

- Inscription individuelle, création ou dépôt de CV sur téléphone, profil avec compétences, disponibilité, attestations et exemples de travaux. Le candidat contrôle la visibilité de son CV.
- Publication d’offres par les entreprises et les partenaires, avec intitulé, métier, ville, contrat, date limite, mode de candidature et date de vérification. Pour les offres externes, afficher la source et orienter vers le canal indiqué. La couverture s’étend progressivement avec les sources autorisées.
- Recherche, alertes, candidature et historique. Les recruteurs suivent les dossiers et les candidats voient les statuts communiqués. Les annonces expirées quittent la liste active.
- Les stages et missions rémunérées précisent la durée, le lieu, le résultat attendu et la rémunération proposée. Prévoir le signalement des annonces et le contrôle des comptes recruteurs.

## Bamousso Académie

- Formations mobiles courtes en vente, marketing, Facebook Ads, TikTok, WhatsApp Business, IA appliquée au commerce et comptabilité simplifiée. Prévoir des leçons, exercices, suivi de progression et attestations de fin de parcours.
- Premiers parcours proposés. Trouver ses premiers clients, vendre sur WhatsApp et TikTok, calculer son prix et sa marge. Exemples de livrables attendus. Un catalogue, un argumentaire ou une grille de prix.
- Dans un lot ultérieur, calculateur de marge puis carnet de ventes, dépenses et paiements restant dus. Le profil peut présenter les réalisations de formation.

## Actualités et visibilité payante

- Fil public avec rubriques Côte d’Ivoire, Afrique et international, économie, BRVM et marchés internationaux, et actualités des entreprises. Afficher la source, la date et, pour les données de marché, l’heure de mise à jour. Retenir des sources dont les conditions permettent l’usage prévu.
- Une entreprise peut publier ses offres et actualités avec images, prix, description, zone et bouton vers son catalogue, une cotation ou une commande.
- Un boost payant est identifié « Sponsorisé ». Hypothèse de lancement à tester. 500 FCFA pour 24 heures. Avant validation, afficher coût, durée et zone. Activer après confirmation du paiement et arrêter la diffusion à l’expiration. Prévoir un historique et des statistiques de vues, clics, demandes et commandes attribuables.
- Le mode de paiement des boosts, les règles de diffusion, la modération et les conditions de remboursement restent à valider avant mise en service.

## Architecture, qualité et livraison

- Réutiliser React côté interface, Express côté serveur et Prisma/PostgreSQL pour les données. Séparer les champs publiables des données RH, des CV, des ventes internes et des coordonnées privées. Restreindre les écritures au compte de l’entreprise concernée et exposer uniquement les champs prévus dans les réponses publiques.
- Déployer par lots. Lot 1A fiche fournisseur et recherche par nom, secteur et ville. Lot 1B catalogue public et recherche par produit. Lot 2 cotations et commandes. Lot 3 Emploi et Académie. Lot 4 actualités et boosts. Les lots indépendants peuvent avancer en parallèle.
- Recette minimale. Une entreprise existante prépare sa fiche, la publie, la retrouve puis la retire. Une autre entreprise ne peut pas la modifier. Aucun champ RH ou brouillon n’apparaît publiquement. Les futurs lots vérifient l’absence de commandes dupliquées, la visibilité des CV, l’expiration des offres et l’arrêt des boosts.
- Livrer par branche et pull request avec vérifications de type, compilation et tests. Tester les migrations sur une base de recette avant toute intervention en production.

### Mise en recette du lot 1A

Appliquer `server/prisma/sql/add-supplier-profile.sql` une fois sur une base de recette existante. Le rôle serveur Prisma doit pouvoir lire et écrire avec les restrictions de la base. L’API directe Supabase ne reçoit aucune politique d’accès à cette table. Générer le client Prisma lors du build du serveur.

Le visiteur ouvre l’annuaire depuis l’accueil. L’administrateur ouvre **Annuaire Pro** depuis son tableau de bord, renseigne sa fiche et choisit de la publier ou de l’enregistrer en brouillon. Le secteur et la ville sont requis pour publier. Les coordonnées facultatives sont saisies spécialement pour l’annuaire. Le premier lot recherche une expression par nom, secteur ou ville. La recherche de produits intervient au lot 1B.

### Mise en recette du lot 1B

Appliquer `server/prisma/sql/add-directory-product-fields.sql` après la mise en place du lot 1A, puis régénérer Prisma au build. Depuis **Catalogue des Produits**, modifier ou créer un article et choisir sa visibilité dans **Annuaire Pro**. La photo est ajoutée par lien HTTPS. Le prix de facturation reste interne lorsque l’option « Sur devis » est choisie. Le catalogue public affiche un état de disponibilité sans indiquer le nombre d’unités.

Vérifier avec deux entreprises que seuls les articles sélectionnés sur une fiche publiée et active sont visibles et trouvables. Vérifier qu’un article retiré disparaît du catalogue et de la recherche, que le prix « Sur devis » est masqué dans la réponse publique et que le catalogue de facturation reste utilisable.

### Mise en recette du lot 2A

Appliquer `server/prisma/sql/add-supplier-quotes.sql` sur la base de recette et régénérer le client Prisma. Deux administrateurs d’entreprises distinctes testent la demande depuis l’annuaire, la réponse chiffrée, l’expiration, le refus et la conversion du devis accepté en commande. Réessayer l’acceptation pour vérifier qu’une seule commande est créée. Une entreprise tierce ne doit pouvoir ni consulter ni modifier le dossier. L’historique conserve le devis accepté et les noms des entreprises au moment de la demande.

Ce lot crée la commande issue d’un devis. La commande directe du catalogue est traitée au lot 2B. Le suivi d’exécution et le paiement relèvent de lots ultérieurs.

### Mise en recette du lot 2B

Appliquer `server/prisma/sql/add-direct-supplier-orders.sql` et régénérer Prisma. Commander un article au prix affiché avec une quantité et une adresse. Le serveur vérifie la publication, le prix et la disponibilité connue, puis conserve le montant TTC. L’acheteur et le fournisseur consultent les commandes dans leurs espaces respectifs. Le fournisseur confirme la disponibilité avec un délai ou indique le motif de refus.

Cette tranche traite un article par commande. Le fournisseur vérifie le stock avant de confirmer. Bamousso ne réserve ni ne déduit automatiquement les quantités et ne collecte pas le paiement.

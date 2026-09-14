# Dashboard FR / EN - etat de la phase 2

## Statut

Implementation poursuivie le 14 septembre 2026. La validation visuelle complete
reste a faire : cette phase n'est pas certifiee « 100 % traduite et testee ».
Aucun changement de fonction metier, de permission ou de calcul financier.

## Perimetre modifie

Les 32 pages sous `apps/frontend/app/dashboard` ont ete raccordees aux libelles
FR/EN, ainsi que leur layout et leurs composants partages :

- Vue d'ensemble : `page.tsx` et `layout.tsx`.
- Caisse : accueil, ventes, factures, retours et rapports.
- Inventaire : vue d'ensemble, produits, categories, stock, alertes et projection.
- Equipe : vue d'ensemble, employes, departements et roles.
- Finances : tableau de bord, ventes, benefices, charges, rapports, exportations et formules.
- Parametres : accueil, boutique, abonnement, notifications, audit, aide et apparence.
- Profil et centre de notifications.

Composants concernes : `cashier-ui.tsx`, `inventory-ui.tsx`, `currency.ts`,
`finance-shared.tsx`, `EmployeModal.tsx`, `DeptModal.tsx`, `DeptTable.tsx`,
`RoleModal.tsx`, `TeamPagination.tsx`, `TeamCsvImportModal.tsx`,
`ProductImportModal.tsx`, `InventoryAuditTable.tsx`, `export-pdf.ts` et `export-xlsx.ts`.

Infrastructure :

- `apps/frontend/src/components/LanguageRuntime.tsx`
- `apps/frontend/src/i18n/catalog.ts`
- `apps/frontend/src/i18n/locales/fr/common.json`
- `apps/frontend/src/i18n/locales/en/common.json`
- `apps/frontend/tests/dashboard-i18n.test.cjs`

## Fonctionnement

Le selecteur existant conserve la preference dans `movoora_language` et informe
le contexte React. Les pages consomment ce contexte pour changer leurs libelles
sans rechargement. Le formatage des nombres et dates utilise FR ou EN.

Les textes fixes utilisent des cles du dictionnaire. Les titres, etats, erreurs,
permissions et messages connus utilisent des traductions explicites. Les messages
contenant un nom, un code ou une quantite utilisent des parametres conserves tels quels.
Les codes de permission utilises par les controles et les valeurs des formulaires
ne sont pas traduits. Les noms de produits, boutiques, roles et personnes restent
des donnees utilisateur.

La traduction automatique mot par mot du DOM est desactivee dans le dashboard,
y compris pour ses modals. Les pages publiques conservent leur fonctionnement.
Les libelles des rapports HTML/PDF/Word et des en-tetes Excel ont ete raccordes.

## Verifications realisees

- TypeScript : `npx tsc --noEmit --incremental false --pretty false`, reussi.
- Tests : `node tests/dashboard-i18n.test.cjs`, 8 tests reussis.
- Parite des cles et parametres FR/EN ; aller-retour de langue ; conservation des
  noms, codes et quantites ; absence de cles manquantes et d'encodage corrompu dans
  les messages du dashboard.
- Rendu initial des 32 pages dans les deux langues avec contexte et navigation
  simules, sans connexion a la base de donnees. Ce n'est pas un test interactif.
- Comparaison de 48 fichiers avec leur contenu avant cette phase : aucune modification
  des attributs de styles, classes CSS, valeurs, clics, liens ou controles examines.
- Aucun changement dans `globals.css` ni dans le backend pendant cette phase.

## Limites de validation

- Le serveur Next local n'a pas pu demarrer dans cet environnement : `spawn EPERM`.
- L'outil navigateur a aussi echoue a initialiser ses fichiers locaux.
- Le parcours interactif complet FR/EN sur ordinateur, tablette et telephone n'a
  donc pas ete execute. Les captures, les modals ouverts, les filtres, les exports
  telecharges et les graphiques en navigateur restent a verifier.
- Le rendu sans navigateur produit des avertissements Recharts sur les dimensions
  des graphiques ; il ne permet pas de conclure sur leur affichage reel.
- Les messages serveur non reconnus sont preserves plutot que traduits approximativement.
  Les scenarios reels d'erreur, d'audit et de notification doivent etre parcourus
  pour identifier et completer les eventuels libelles encore manquants.

Ne pas annoncer l'absence totale de melange FR/EN avant ce parcours final.

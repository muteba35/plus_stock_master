# Revue ciblee OWASP et interface - 2 octobre 2026

## Portee

Revue de code et tests de regression locaux. Ce n'est ni un pentest exhaustif ni une certification OWASP/NIST. Reference : https://owasp.org/projects/api-security-project

## Corrections de cette passe

- Controle des fonctions et objets (API1/API5) : l'affectation d'un role existant lors de la creation/modification d'un employe verifie maintenant que l'auteur possede les permissions attribuees. Le proprietaire conserve ses droits. Ce controle complete celui de creation/modification des roles.
- Personnalisation : MODIFIER_PERSONNALISATION existe dans le seed, filtre le sous-menu et protege PATCH /boutiques/:id/appearance. Le GET de l'apparence reste accessible aux utilisateurs authentifies de la boutique active afin d'appliquer son theme. Un test couvre le refus de modification sans permission et l'acces du proprietaire.
- Abus de flux metier (API6) : activate-test refuse maintenant toute activation en production. Le test local reste disponible. Il ne s'agit pas de reintroduire un verrou d'abonnement sur les modules.
- Limitation des ressources (API4) : plafond additionnel de 100 requetes publiques d'authentification par IP sur 15 minutes, en complement des limites par compte. Changer d'adresse email ne contourne plus ce plafond commun.
- Injection : tests du rejet des operateurs Mongo, des cles de prototype et des cles avec points. Cela ne remplace pas la validation metier propre a chaque endpoint.
- CORS : test du rejet d'une origine inconnue. La configuration de production doit conserver uniquement les origines reellement necessaires.

## Interface

- Deconnexion : blocage immediat du rendu protege, nettoyage local et remplacement de la page par /login. Les reponses de synchronisation arrivees apres deconnexion ou remplacement du jeton sont ignorees.
- Logo : suppression du cadre de marque autour du logo personnalise dans la sidebar et l'apercu. Les proportions sont conservees. Les elements graphiques presents dans l'image importee elle-meme ne sont pas effaces.
- Import : PNG/JPEG/WebP jusqu'a 5 Mo et 4096 x 4096 pixels ; reduction a 512 pixels maximum avant envoi. Le serveur continue de decoder/reencoder l'image et de limiter sa taille a 500 Ko. Les SVG utilisateur ne sont pas acceptes comme documents actifs.
- Retour mobile : bouton icone de taille fixe, libelle accessible et espaces reduits dans la navbar d'authentification. Le libelle de langue est masque sur mobile dans sa version compacte, avec maintien du drapeau et du menu.

## Resultats

- export-audit : 7 tests passes.
- owasp-regression : 3 tests passes.
- auth-security : 13 tests passes (incluant le test parent).
- dashboard-phase3 : 5 tests passes.
- TypeScript sans emission : passe.
- Demarrage Next.js : bloque par spawn EPERM dans cet environnement. Rendu mobile, chronometrage de deconnexion et import reel a confirmer dans le navigateur.
- npm audit backend et frontend : echec de verification du certificat TLS du registre. Aucun resultat exploitable sur les vulnerabilites des dependances ; aucune verification TLS desactivee.

## Points encore ouverts avant de qualifier la securite de complete

1. La deconnexion actuelle efface le jeton du navigateur, mais ne revoque pas individuellement un JWT deja copie. La revocation lors d'un changement de mot de passe est couverte ; la gestion de sessions/revocation a la deconnexion reste distincte.
2. Le jeton demeure dans localStorage et accessible au JavaScript. Revoir le stockage de session, les injections HTML des apercus/impressions et la CSP du frontend avant de conclure sur le risque XSS.
3. Les limiteurs utilisent un stockage local au processus : prevoir un stockage partage en cas de plusieurs instances et verifier trust proxy sur l'hebergement reel.
4. Terminer l'audit exhaustif des endpoints et de tous les exports, avec comptes reels de deux proprietaires et employes, requetes directes et changement de permissions pendant une session.
5. Tester les paiements : confirmation fournisseur, montant, devise, idempotence et absence d'activation sur simple reponse frontend.
6. Relancer npm audit avec une chaine de certificats de confiance correctement configuree ; ne pas utiliser strict-ssl=false.
7. Renouveler les secrets deja partages dans la conversation (base de donnees, JWT, email et fournisseurs de paiement/email), sans les republier. Verifier aussi leur absence dans l'historique Git.

## Deploiement

Deployer backend et frontend ensemble. Si MODIFIER_PERSONNALISATION manque dans la base distante, executer le seed habituel sur la bonne base puis attribuer cette permission au role concerne. Aucun seed, changement de secret ou deploiement n'a ete effectue pendant cette passe.

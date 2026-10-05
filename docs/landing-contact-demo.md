# Contact et demonstration

- Le formulaire envoie uniquement vers juniormuteba10@gmail.com via le fournisseur email deja configure. L'adresse du visiteur est Reply-To, jamais From.
- Validation serveur, consentement obligatoire, echappement HTML, champ anti-robot et maximum de 3 demandes par IP sur 15 minutes. La limite en memoire est par instance : utiliser un stockage partage et envisager un CAPTCHA si le volume ou les abus augmentent.
- Resend sans domaine verifie peut refuser ce destinataire s'il differe de l'adresse autorisee du compte. Dans ce cas le formulaire signale un echec, pas un faux succes.
- La video n'est pas fournie. La fenetre affiche donc la simulation interactive existante. Pour ajouter une video, definir NEXT_PUBLIC_DEMO_VIDEO_URL avec une URL HTTPS directe MP4/WebM ou un chemin public local, puis reconstruire le frontend. Un lien de page YouTube n'est pas une URL video directe.
- Fournir une video de demonstration sans donnees personnelles, idealement avec sous-titres integres. Lecture volontaire, commandes natives, mode inline sur mobile. Une erreur de lecture affiche la simulation.
- Deployer backend et frontend ensemble. Tester un envoi reel et confirmer sa reception avant publication; les tests locaux n'envoient aucun email.

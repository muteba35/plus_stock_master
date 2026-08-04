"use client";

import { useEffect, useState } from "react";

type AppLanguage = "fr" | "en";

const exactTranslations = new Map<string, string>([
  ["Accueil", "Home"],
  ["Fonctionnalités", "Features"],
  ["Solutions", "Solutions"],
  ["Tarifs", "Pricing"],
  ["À propos", "About"],
  ["A propos", "About"],
  ["Essai Gratuit", "Free Trial"],
  ["Essai", "Trial"],
  ["Retour", "Back"],
  ["Commerce Platform", "Commerce Platform"],
  ["Votre boutique partout", "Your store everywhere"],
  ["Une gestion Sans Limites.", "Management without limits."],
  ["Application Mobile", "Mobile App"],
  ["Vente Instantanée", "Instant Sale"],
  ["Multi-Points de Vente", "Multi-store POS"],
  ["Continuité de Service", "Service Continuity"],
  ["Zéro interruption Hors Connexion.", "Zero interruption offline."],
  ["Fiabilité garantie 24h/7j", "Reliability guaranteed 24/7"],
  ["Sécurité Maximale", "Maximum Security"],
  ["Protection & Confidentialité.", "Protection & Privacy."],
  ["Données Protégées", "Protected Data"],
  ["Outils de Gestion", "Management Tools"],
  ["Tout pour Réussir.", "Everything to succeed."],
  ["Tableau de Bord", "Dashboard"],
  ["Traçabilité Totale", "Full Traceability"],
  ["Gestion d'Équipe", "Team Management"],
  ["Rapports & Ventes", "Reports & Sales"],
  ["Paiements Sécurisés", "Secure Payments"],
  ["Alertes de Stock", "Stock Alerts"],
  ["Abonnements", "Subscriptions"],
  ["Des offres pour chaque niveau de croissance.", "Plans for every stage of growth."],
  ["Notre Engagement", "Our Commitment"],
  ["Une solution pensée Pour Vous.", "A solution designed for you."],
  ["Se connecter", "Sign in"],
  ["Créer un compte", "Create an account"],
  ["Ravis de vous revoir sur Movoora", "Glad to see you again on Movoora"],
  ["Connectez-vous pour reprendre le contrôle de vos opérations.", "Sign in to take control of your operations again."],
  ["Adresse email", "Email address"],
  ["Mot de passe", "Password"],
  ["Mot de passe oublié ?", "Forgot password?"],
  ["Inscription", "Sign up"],
  ["Créer votre espace", "Create your workspace"],
  ["Vérification OTP", "OTP verification"],
  ["Vérifier le code", "Verify code"],
  ["Renvoyer un code", "Resend code"],
  ["Réinitialisation de mot de passe", "Password reset"],
  ["Nom", "Last name"],
  ["Prénom", "First name"],
  ["Téléphone", "Phone"],
  ["Confirmer le mot de passe", "Confirm password"],
  ["Déjà un compte ?", "Already have an account?"],
  ["Créer ma boutique", "Create my store"],
  ["Nom de la boutique", "Store name"],
  ["Secteur d'activité", "Business sector"],
  ["Taille de l'entreprise", "Business size"],
  ["Continuer", "Continue"],
  ["Valider", "Confirm"],
  ["Annuler", "Cancel"],
  ["Rechercher...", "Search..."],
  ["Déconnexion", "Logout"],
  ["Se déconnecter", "Logout"],
  ["Paramètres", "Settings"],
  ["Tableau de bord", "Dashboard"],
  ["Inventaire", "Inventory"],
  ["Caisse", "Checkout"],
  ["Mon Equipe", "My Team"],
  ["Mon Équipe", "My Team"],
  ["Finances", "Finance"],
  ["Vue d'ensemble", "Overview"],
  ["Gestion Produits", "Product Management"],
  ["Catégories", "Categories"],
  ["Mouvements Stock", "Stock Movements"],
  ["Alertes Rupture", "Stock Alerts"],
  ["Projection Produits", "Product Projection"],
  ["Accueil Caisse", "Checkout Home"],
  ["Historique Ventes", "Sales History"],
  ["Factures", "Invoices"],
  ["Retours Clients", "Customer Returns"],
  ["Rapports Caisse", "Checkout Reports"],
  ["Employés", "Employees"],
  ["Départements", "Departments"],
  ["Rôles", "Roles"],
  ["Bénéfices & Pertes", "Profit & Loss"],
  ["Dépenses & Charges", "Expenses & Costs"],
  ["Rapports d'activité", "Activity Reports"],
  ["Formules", "Formulas"],
  ["Ma Boutique", "My Store"],
  ["Abonnement", "Subscription"],
  ["Notifications", "Notifications"],
  ["Journal d'audit", "Audit Log"],
  ["Aide", "Help"],
  ["Profil", "Profile"],
  ["Module premium", "Premium module"],
  ["Mettre à niveau", "Upgrade"],
  ["Mettre a niveau", "Upgrade"],
  ["Choisir un abonnement", "Choose a subscription"],
  ["Essai terminé", "Trial ended"],
  ["Accès restreint", "Restricted access"],
  ["Changer la langue", "Change language"],
]);

const phraseTranslations: Array<[RegExp, string]> = [
  [/Installez Movoora sur votre téléphone et gérez vos stocks comme une application native\./g, "Install Movoora on your phone and manage your stock like a native app."],
  [/Une interface fluide conçue pour encaisser vos clients en quelques secondes sans attente\./g, "A smooth interface built to checkout customers in seconds without waiting."],
  [/Pilotez toutes vos boutiques depuis un compte unique, peu importe leur emplacement géographique\./g, "Manage all your stores from one account, wherever they are located."],
  [/L'internet tombe \? Votre commerce continue\./g, "Internet goes down? Your business keeps running."],
  [/Enregistrez vos ventes et mouvements de stock en mode hors-ligne\./g, "Record sales and stock movements offline."],
  [/Le système se synchronise automatiquement dès le retour du réseau\./g, "The system syncs automatically when the network returns."],
  [/Vos informations commerciales sont précieuses\./g, "Your business information is valuable."],
  [/Choisissez qui accède à quoi/g, "Choose who can access what"],
  [/définissez des rôles précis pour vos vendeurs, gérants et administrateurs\./g, "set precise roles for sellers, managers and administrators."],
  [/Historique complet de chaque action/g, "Complete history of every action"],
  [/Accès sécurisé par mot de passe/g, "Secure password access"],
  [/Sauvegarde automatique sécurisée/g, "Secure automatic backup"],
  [/Une vue globale et simplifiée de la santé de votre business en temps réel\./g, "A simple global view of your business health in real time."],
  [/Suivez chaque mouvement de stock : qui a fait quoi, où et quand exactement\./g, "Track every stock movement: who did what, where and exactly when."],
  [/Collaborez avec vos employés tout en gardant un contrôle total sur leurs permissions\./g, "Collaborate with your employees while keeping full control over their permissions."],
  [/Analysez vos revenus et identifiez vos produits les plus rentables en un clic\./g, "Analyze revenue and identify your most profitable products in one click."],
  [/Gestion simple et protégée de vos abonnements avec facturation transparente\./g, "Simple and protected subscription management with transparent billing."],
  [/Recevez une notification avant la rupture pour ne plus jamais rater de vente\./g, "Receive a notification before stockout so you never miss a sale."],
  [/Commencez avec l'essai gratuit, puis débloquez les modules avancés selon la taille de votre boutique\./g, "Start with the free trial, then unlock advanced modules according to your store size."],
  [/Nous avons conçu Movoora pour répondre aux défis quotidiens des entrepreneurs\./g, "We designed Movoora to answer entrepreneurs' daily challenges."],
  [/Simplicité, sécurité et efficacité sont les fondations de notre service\./g, "Simplicity, security and efficiency are the foundations of our service."],
  [/Ce module est disponible dans l'offre/g, "This module is available in the"],
  [/Mettez votre boutique à niveau pour le débloquer\./g, "Upgrade your store to unlock it."],
  [/Vos données restent conservées\./g, "Your data remains safely stored."],
  [/Pour continuer à utiliser la caisse, l'inventaire, l'équipe et la finance,/g, "To continue using checkout, inventory, team and finance,"],
  [/choisissez un abonnement adapté à votre boutique\./g, "choose a subscription adapted to your store."],
];

const wordTranslations: Array<[RegExp, string]> = [
  [/\bAjouter\b/g, "Add"], [/\bCréer\b/g, "Create"], [/\bModifier\b/g, "Edit"], [/\bSupprimer\b/g, "Delete"],
  [/\bEnregistrer\b/g, "Save"], [/\bRechercher\b/g, "Search"], [/\bFiltrer\b/g, "Filter"], [/\bExporter\b/g, "Export"],
  [/\bImporter\b/g, "Import"], [/\bVoir\b/g, "View"], [/\bFermer\b/g, "Close"], [/\bStatut\b/g, "Status"],
  [/\bProduit\b/g, "Product"], [/\bProduits\b/g, "Products"], [/\bCatégorie\b/g, "Category"], [/\bCatégories\b/g, "Categories"],
  [/\bQuantité\b/g, "Quantity"], [/\bPrix\b/g, "Price"], [/\bStock\b/g, "Stock"], [/\bDate\b/g, "Date"],
  [/\bClient\b/g, "Customer"], [/\bVente\b/g, "Sale"], [/\bVentes\b/g, "Sales"], [/\bRetour\b/g, "Return"],
  [/\bFacture\b/g, "Invoice"], [/\bFactures\b/g, "Invoices"], [/\bPaiement\b/g, "Payment"], [/\bTVA\b/g, "VAT"],
  [/\bUtilisateur\b/g, "User"], [/\bUtilisateurs\b/g, "Users"], [/\bEmployé\b/g, "Employee"], [/\bEmployés\b/g, "Employees"],
  [/\bDépartement\b/g, "Department"], [/\bRôle\b/g, "Role"], [/\bPermissions\b/g, "Permissions"], [/\bBoutique\b/g, "Store"],
  [/\bDevise\b/g, "Currency"], [/\bTaux\b/g, "Rate"], [/\bRapport\b/g, "Report"], [/\bRapports\b/g, "Reports"],
  [/\bBénéfice\b/g, "Profit"], [/\bPerte\b/g, "Loss"], [/\bCharges\b/g, "Expenses"], [/\bDépenses\b/g, "Expenses"],
  [/\bAujourd'hui\b/g, "Today"], [/\bCette semaine\b/g, "This week"], [/\bCe mois\b/g, "This month"], [/\bPériode personnalisée\b/g, "Custom period"],
  [/\bActif\b/g, "Active"], [/\bInactive\b/g, "Inactive"], [/\bNon lu\b/g, "Unread"], [/\bLu\b/g, "Read"],
];

const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();

const translateValue = (value: string, language: AppLanguage) => {
  if (language === "fr") return value;
  const trimmed = value.trim();
  const exact = exactTranslations.get(trimmed);
  if (exact) return value.replace(trimmed, exact);
  let translated = value;
  phraseTranslations.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });
  wordTranslations.forEach(([pattern, replacement]) => {
    translated = translated.replace(pattern, replacement);
  });
  return translated;
};

const applyLanguage = (language: AppLanguage) => {
  if (typeof document === "undefined" || !document.body) return;
  document.documentElement.lang = language;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue || "");
    const original = originalTextNodes.get(node) || "";
    const next = translateValue(original, language);
    if (node.nodeValue !== next) node.nodeValue = next;
  });

  const attrs = ["placeholder", "title", "aria-label"];
  document.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label]").forEach((element) => {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = {};
      originalAttributes.set(element, originals);
    }

    attrs.forEach((attr) => {
      const current = element.getAttribute(attr);
      if (!current || !current.trim()) return;
      if (!originals[attr]) originals[attr] = current;
      const original = originals[attr];
      const next = translateValue(original, language);
      if (current !== next) element.setAttribute(attr, next);
    });
  });
};

export default function LanguageRuntime() {
  const [language, setLanguage] = useState<AppLanguage>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("movoora_language");
    setLanguage(saved === "en" ? "en" : "fr");

    const handleLanguageChange = (event: Event) => {
      const custom = event as CustomEvent<AppLanguage>;
      setLanguage(custom.detail === "en" ? "en" : "fr");
    };

    window.addEventListener("movoora-language-change", handleLanguageChange as EventListener);
    return () => window.removeEventListener("movoora-language-change", handleLanguageChange as EventListener);
  }, []);

  useEffect(() => {
    localStorage.setItem("movoora_language", language);
    const apply = () => applyLanguage(language);
    const timer = window.setTimeout(apply, 0);
    const observer = new MutationObserver(() => window.setTimeout(apply, 0));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [language]);

  return null;
}

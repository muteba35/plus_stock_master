import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Importation du modèle Permission
import { Permission, RolePermission } from './models/Utilisateur.js';

// Chargement des variables d'environnement
dotenv.config();

const permissions = [
  // --- MODULE : AUTHENTIFICATION ---
  { nom: "CONNEXION_AVEC_OTP", module: "AUTHENTIFICATION", description: "Exige un code OTP apres la validation du mot de passe" },
  { nom: "CONNEXION_SANS_OTP", module: "AUTHENTIFICATION", description: "Autorise la connexion directe sans code OTP" },

  // --- MODULE : DASHBOARD ---
  { nom: "VOIR_RESUME_VENTES", module: "DASHBOARD", description: "Consulter les statistiques globales sur la page d'accueil" },
  { nom: "VOIR_ALERTES_STOCK", module: "INVENTAIRE", description: "Consulter les alertes de rupture et de stock faible" },
  { nom: "REAPPROVISIONNER_STOCK", module: "INVENTAIRE", description: "Réapprovisionner un produit directement depuis une alerte de stock" },

  // --- MODULE : VENTE ---
  { nom: "EFFECTUER_VENTE", module: "VENTE", description: "Autorise l'accès à la caisse et la validation des paniers" },
  { nom: "APPLIQUER_REMISE", module: "VENTE", description: "Permet d'appliquer des réductions sur le prix de vente" },
  { nom: "ANNULER_VENTE", module: "VENTE", description: "Permet de supprimer une vente déjà validée (Droit sensible)" },
  { nom: "IMPRIMER_FACTURE", module: "VENTE", description: "Permet de générer le ticket de caisse" },
  { nom: "VOIR_MES_VENTES", module: "VENTE", description: "Consulter uniquement les ventes que l\'utilisateur a lui-même encaissées" },
  { nom: "EXPORTER_HISTORIQUE_VENTES", module: "VENTE", description: "Exporter l'historique des ventes en Excel, Word ou PDF" },
  { nom: "VOIR_FACTURES", module: "VENTE", description: "Consulter toutes les factures de la boutique" },
  { nom: "VOIR_MES_FACTURES", module: "VENTE", description: "Consulter uniquement ses propres factures" },
  { nom: "EXPORTER_FACTURES", module: "VENTE", description: "Exporter les factures en Excel, Word ou PDF" },
  { nom: "VOIR_RETOURS_CLIENTS", module: "VENTE", description: "Consulter tous les retours clients de la boutique" },
  { nom: "VOIR_MES_RETOURS_CLIENTS", module: "VENTE", description: "Consulter uniquement ses propres retours clients" },
  { nom: "CREER_RETOUR_CLIENT", module: "VENTE", description: "Enregistrer un remboursement, un echange ou un avoir client" },
  { nom: "EXPORTER_RETOURS_CLIENTS", module: "VENTE", description: "Exporter les retours clients en Excel, Word ou PDF" },

  // --- MODULE : INVENTAIRE ---
  { nom: "VOIR_RESUME_INVENTAIRE", module: "INVENTAIRE", description: "Consulter la vue globale et les indicateurs de l'inventaire" },
  { nom: "VOIR_LISTE_PRODUITS", module: "INVENTAIRE", description: "Consulter le catalogue des articles" },
  { nom: "AJOUTER_PRODUIT", module: "INVENTAIRE", description: "Permet d'enregistrer de nouveaux articles en stock" },
  { nom: "MODIFIER_PRODUIT", module: "INVENTAIRE", description: "Permet de modifier les informations d'un produit" },
  { nom: "VOIR_PRIX_ACHAT", module: "INVENTAIRE", description: "Permet de voir le prix d'achat (protection des marges)" },
  { nom: "CREER_ENTREE_STOCK", module: "INVENTAIRE", description: "Enregistrer une entrée ou un réapprovisionnement de stock" },
  { nom: "CREER_SORTIE_STOCK", module: "INVENTAIRE", description: "Enregistrer une sortie manuelle de stock" },
  { nom: "CREER_AJUSTEMENT_STOCK", module: "INVENTAIRE", description: "Corriger le stock après un comptage physique" },
  { nom: "VOIR_MOUVEMENTS_STOCK", module: "INVENTAIRE", description: "Consulter l'historique des entrées, sorties et ajustements de stock" },
  { nom: "VOIR_MES_OPERATIONS_INVENTAIRE", module: "INVENTAIRE", description: "Consulter uniquement ses propres mouvements de stock et actions dans le journal d'inventaire" },
  { nom: "EXPORTER_MOUVEMENTS_STOCK", module: "INVENTAIRE", description: "Exporter l'historique des mouvements de stock en Excel ou PDF" },
  { nom: "SUPPRIMER_PRODUIT", module: "INVENTAIRE", description: "Retirer un produit du système" },
  { nom: "VOIR_CATEGORIES", module: "INVENTAIRE", description: "Consulter les catégories de produits de la boutique" },
  { nom: "CREER_CATEGORIE", module: "INVENTAIRE", description: "Créer une nouvelle catégorie de produits" },
  { nom: "MODIFIER_CATEGORIE", module: "INVENTAIRE", description: "Modifier le nom, la description ou la couleur d'une catégorie" },
  { nom: "SUPPRIMER_CATEGORIE", module: "INVENTAIRE", description: "Supprimer une catégorie qui ne contient aucun produit" },

  // --- MODULE : EQUIPE (Mis à jour) ---
  { nom: "VOIR_EQUIPE", module: "EQUIPE", description: "Consulter la vue d'ensemble et les indicateurs du module equipe" },
  { nom: "VOIR_ROLES", module: "EQUIPE", description: "Permet de consulter la liste des rôles et habilitations" }, 
  { nom: "CREER_ROLE", module: "EQUIPE", description: "Permet de créer un nouveau rôle de sécurité" },
  { nom: "MODIFIER_ROLE", module: "EQUIPE", description: "Permet de modifier les permissions d'un rôle existant" },
  { nom: "SUPPRIMER_ROLE", module: "EQUIPE", description: "Permet de supprimer définitivement un rôle" },
  { nom: "VOIR_DEPARTEMENTS", module: "EQUIPE", description: "Permet de consulter la liste des départements" },
  { nom: "CREER_DEPARTEMENT", module: "EQUIPE", description: "Permet d'ajouter un nouveau département" },
  { nom: "MODIFIER_DEPARTEMENT", module: "EQUIPE", description: "Permet de modifier les informations d'un département existant" },
  { nom: "SUPPRIMER_DEPARTEMENT", module: "EQUIPE", description: "Autorise la suppression définitive d'un département" },
  { nom: "VOIR_EMPLOYES", module: "EQUIPE", description: "Permet de voir tous les utilisateurs dans la boutique" },
  { nom: "AJOUTER_EMPLOYE", module: "EQUIPE", description: "Permet d'insérer de nouveaux utilisateurs dans la boutique" },
  { nom: "MODIFIER_EMPLOYE", module: "EQUIPE", description: "Changer les accès ou infos d'un collègue" },
  { nom: "SUSPENDRE_EMPLOYE", module: "EQUIPE", description: "Suspendre l'accès d'un travailleur" },
  { nom: "BLOQUER_EMPLOYE", module: "EQUIPE", description: "Bloquer l'accès d'un travailleur" },
  { nom: "SUPPRIMER_EMPLOYE", module: "EQUIPE", description: "Supprimer definitivement un employe de la boutique" },
  { nom: "RESET_PASSWORD_EMPLOYE", module: "EQUIPE", description: "Permet au propriétaire de réinitialiser le mot de passe d'un employé bloqué" },

  // --- MODULE : PROFIL ---
  { nom: "MODIFIER_PROFIL_TOTAL", module: "PROFIL", description: "Droit exclusif du Propriétaire pour modifier toutes les données d'identité critiques de la structure" },
  { nom: "MODIFIER_PROFIL_RESTREINT", module: "PROFIL", description: "Droit de l'Employé pour mettre à jour uniquement ses infos personnelles non critiques" },

  // --- MODULE : FINANCE ---
  { nom: "VOIR_HISTORIQUE_VENTES", module: "FINANCE", description: "Consulter la liste de toutes les transactions passées" },
  { nom: "VOIR_CHIFFRE_AFFAIRE", module: "FINANCE", description: "Voir le total des ventes réalisées" },
  { nom: "VOIR_BENEFICES", module: "FINANCE", description: "Donne accès au calcul des profits nets" },
  { nom: "EXPORTER_RAPPORTS", module: "FINANCE", description: "Télécharger les rapports en PDF/Excel" },

  // --- MODULE : PARAMETRES ---
  { nom: "VOIR_BOUTIQUES", module: "PARAMETRES", description: "Consulter les boutiques du compte proprietaire" },
  { nom: "CREER_BOUTIQUE", module: "PARAMETRES", description: "Creer une nouvelle boutique rattachee au compte" },
  { nom: "MODIFIER_BOUTIQUE", module: "PARAMETRES", description: "Modifier les informations d'une boutique" },
  { nom: "SUPPRIMER_BOUTIQUE", module: "PARAMETRES", description: "Supprimer une boutique non active" },
  { nom: "ACTIVER_BOUTIQUE", module: "PARAMETRES", description: "Changer la boutique active de la session" },
  { nom: "MODIFIER_INFOS_BOUTIQUE", module: "PARAMETRES", description: "Changer le nom, logo ou adresse de la boutique" },
  { nom: "CHANGER_DEVISE", module: "PARAMETRES", description: "Modifier la monnaie de travail (USD, CDF, EUR)" },

  // --- MODULE : ABONNEMENT ---
  { nom: "VOIR_ABONNEMENT", module: "ABONNEMENT", description: "Consulter le statut du plan actuel" },
  { nom: "GERER_ABONNEMENT", module: "ABONNEMENT", description: "Permet de modifier le plan de paiement du logiciel" }
];

const seedDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Master_stock_local';
    
    await mongoose.connect(mongoURI);
    console.log("Connexion à MongoDB établie pour le seeding...");
    console.log("Début de la synchronisation des permissions...");

    const promises = permissions.map(p => 
      Permission.findOneAndUpdate(
        { nom: p.nom }, 
        p,              
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );

    await Promise.all(promises);
    const deprecatedPermission = await Permission.findOne({ nom: "AJUSTER_STOCK" });
    if (deprecatedPermission) {
      await RolePermission.deleteMany({ permissionId: deprecatedPermission._id });
      await Permission.deleteOne({ _id: deprecatedPermission._id });
      console.log("Permission obsolète AJUSTER_STOCK supprimée avec ses associations.");
    }
    console.log(`Succès : ${permissions.length} permissions ont été synchronisées.`);
    
  } catch (error) {
    console.error("Erreur lors du seeding des permissions :", error);
  } finally {
    await mongoose.connection.close();
    console.log("Connexion MongoDB fermée.");
    process.exit();
  }
};

seedDB();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Importation du modèle Permission
import { Permission } from './models/Utilisateur.js'; 

// Chargement des variables d'environnement
dotenv.config();

const permissions = [
  // --- MODULE : DASHBOARD ---
  { nom: "VOIR_RESUME_VENTES", module: "DASHBOARD", description: "Consulter les statistiques globales sur la page d'accueil" },
 
  // --- MODULE : VENTE ---
  { nom: "EFFECTUER_VENTE", module: "VENTE", description: "Autorise l'accès à la caisse et la validation des paniers" },
  { nom: "APPLIQUER_REMISE", module: "VENTE", description: "Permet d'appliquer des réductions sur le prix de vente" },
  { nom: "ANNULER_VENTE", module: "VENTE", description: "Permet de supprimer une vente déjà validée (Droit sensible)" },
  { nom: "IMPRIMER_FACTURE", module: "VENTE", description: "Permet de générer le ticket de caisse" },

  // --- MODULE : INVENTAIRE ---
  { nom: "VOIR_LISTE_PRODUITS", module: "INVENTAIRE", description: "Consulter le catalogue des articles" },
  { nom: "AJOUTER_PRODUIT", module: "INVENTAIRE", description: "Permet d'enregistrer de nouveaux articles en stock" },
  { nom: "MODIFIER_PRODUIT", module: "INVENTAIRE", description: "Permet de modifier les informations d'un produit" },
  { nom: "VOIR_PRIX_ACHAT", module: "INVENTAIRE", description: "Permet de voir le prix d'achat (protection des marges)" },
  { nom: "AJUSTER_STOCK", module: "INVENTAIRE", description: "Modifier manuellement les quantités en stock" },
  { nom: "SUPPRIMER_PRODUIT", module: "INVENTAIRE", description: "Retirer un produit du système" },
  { nom: "VOIR_ALERTES_STOCK", module: "INVENTAIRE", description: "Recevoir les notifications de rupture de stock" },

  // --- MODULE : EQUIPE (Mis à jour) ---
 
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
  { nom: "SUPPRIMER_EMPLOYE", module: "EQUIPE", description: "Supprimer un employé du système" },
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

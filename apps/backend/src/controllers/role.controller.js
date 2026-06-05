import { Role, RolePermission, Permission, Utilisateur } from '../models/Utilisateur.js';
import mongoose from 'mongoose';

// ==========================================
// 0. RÉCUPÉRER TOUTES LES PERMISSIONS DISPONIBLES ()
// ==========================================
export const getAvailablePermissions = async (req, res) => {
  try {
    // Récupère toutes les permissions de la BDD triées par module
    const permissions = await Permission.find().sort({ module: 1 });
    
    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error("Erreur getAvailablePermissions :", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des permissions système." });
  }
};

// ==========================================
// 1. CRÉER UN RÔLE (Avec liaisons intermédiaires)
// ==========================================
export const createRole = async (req, res) => {
  try {
    const { nom, permissions } = req.body; // permissions = ["ID_MONGODB_1", "ID_MONGODB_2"]
    const boutiqueId = req.user.boutiqueId; // Injecté par le middleware 'protect'

    if (!nom) {
      return res.status(400).json({ message: "Le nom du rôle est requis." });
    }

    // Sécurité : Éviter les doublons au sein de la même boutique
    const roleExistant = await Role.findOne({ nom: nom.trim(), boutiqueId });
    if (roleExistant) {
      return res.status(400).json({ message: "Un rôle avec ce nom existe déjà dans votre boutique." });
    }

    // 1. Création du rôle principal
    const nouveauRole = await Role.create({
      nom: nom.trim(),
      boutiqueId
    });

    // 2. Association des permissions dans la table intermédiaire RolePermission
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const rolePermissionsData = permissions.map(permId => ({
        roleId: nouveauRole._id,
        permissionId: permId
      }));
      
      // Insertion de masse
      await RolePermission.insertMany(rolePermissionsData);
    }

    return res.status(201).json({
      success: true,
      message: "Rôle créé avec succès !",
      role: nouveauRole
    });

  } catch (error) {
    console.error("Erreur createRole :", error);
    return res.status(500).json({ message: "Erreur lors de la création du rôle." });
  }
};

// ==========================================
// 2. RÉCUPÉRER TOUS LES RÔLES D'UNE BOUTIQUE
// ==========================================
export const getRoles = async (req, res) => {
  try {
    const boutiqueId = req.user.boutiqueId;

    // Trouver tous les rôles de la boutique
    const roles = await Role.find({ boutiqueId });

    // Lier dynamiquement les permissions pour chaque rôle
    const rolesAvecPermissions = await Promise.all(
      roles.map(async (role) => {
        const liaisons = await RolePermission.find({ roleId: role._id }).populate("permissionId");
        
        // On extrait uniquement l'objet de la permission et on filtre les nuls si une permission a été supprimée
        const permissionsAssociees = liaisons.map(l => l.permissionId).filter(Boolean);
        
        return {
          ...role.toObject(),
          permissions: permissionsAssociees
        };
      })
    );

    return res.status(200).json({
      success: true,
      roles: rolesAvecPermissions
    });

  } catch (error) {
    console.error("Erreur getRoles :", error);
    return res.status(500).json({ message: "Erreur lors de la récupération des rôles." });
  }
};

// ==========================================
// 3. RÉCUPÉRER UN RÔLE SPÉCIFIQUE PAR SON ID
// ==========================================
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user.boutiqueId;

    const role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Rôle introuvable dans votre boutique." });
    }

    const liaisons = await RolePermission.find({ roleId: role._id }).populate("permissionId");
    const permissionsAssociees = liaisons.map(l => l.permissionId).filter(Boolean);

    return res.status(200).json({
      success: true,
      role: {
        ...role.toObject(),
        permissions: permissionsAssociees
      }
    });

  } catch (error) {
    console.error("Erreur getRoleById :", error);
    return res.status(500).json({ message: "Erreur lors de la récupération du rôle." });
  }
};

// ==========================================
// 4. MODIFIER UN RÔLE ET SES PERMISSIONS
// ==========================================
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, permissions } = req.body; 
    const boutiqueId = req.user.boutiqueId;

    let role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Rôle introuvable." });
    }

    if (nom && nom.trim() !== role.nom) {
      const doublon = await Role.findOne({ nom: nom.trim(), boutiqueId, _id: { $ne: id } });
      if (doublon) {
        return res.status(400).json({ message: "Un autre rôle porte déjà ce nom dans votre boutique." });
      }
      role.nom = nom.trim();
      await role.save();
    }

    // Synchronisation atomique des permissions
    if (permissions && Array.isArray(permissions)) {
      // Étape A : Vider les anciennes autorisations
      await RolePermission.deleteMany({ roleId: id });

      // Étape B : Réinsérer le nouveau lot sélectionné sur le formulaire
      if (permissions.length > 0) {
        const rolePermissionsData = permissions.map(permId => ({
          roleId: id,
          permissionId: permId
        }));
        await RolePermission.insertMany(rolePermissionsData);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Rôle et permissions mis à jour avec succès !"
    });

  } catch (error) {
    console.error("Erreur updateRole :", error);
    return res.status(500).json({ message: "Erreur lors de la modification du rôle." });
  }
};

// ==========================================
// 5. SUPPRIMER UN RÔLE
// ==========================================
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user.boutiqueId;

    const role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Rôle introuvable." });
    }

    // Sécurité critique : Bloquer la suppression si le rôle est utilisé par un employé
    const utilisateurAvecCeRole = await Utilisateur.findOne({ roleId: id });
    if (utilisateurAvecCeRole) {
      return res.status(400).json({ 
        message: "Action impossible : Ce rôle est actuellement attribué à un ou plusieurs employés." 
      });
    }

    // Nettoyage de la table intermédiaire puis suppression du rôle
    await RolePermission.deleteMany({ roleId: id });
    await Role.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Rôle supprimé avec succès !"
    });

  } catch (error) {
    console.error("Erreur deleteRole :", error);
    return res.status(500).json({ message: "Erreur lors de la suppression du rôle." });
  }
};
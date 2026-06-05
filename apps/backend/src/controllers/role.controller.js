import mongoose from "mongoose";
import { Role, RolePermission, Permission, Utilisateur } from "../models/Utilisateur.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizePermissionIds = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];

  return [...new Set(
    permissions
      .filter((permissionId) => typeof permissionId === "string")
      .map((permissionId) => permissionId.trim())
      .filter(Boolean)
  )];
};

const validatePermissionIds = async (permissionIds) => {
  const invalidFormatIds = permissionIds.filter((permissionId) => !isValidObjectId(permissionId));

  if (invalidFormatIds.length > 0) {
    return {
      isValid: false,
      message: "Une ou plusieurs permissions selectionnees sont invalides."
    };
  }

  if (permissionIds.length === 0) {
    return { isValid: true, validIds: [] };
  }

  const existingPermissions = await Permission.find({ _id: { $in: permissionIds } }).select("_id");
  const existingIds = new Set(existingPermissions.map((permission) => permission._id.toString()));
  const missingIds = permissionIds.filter((permissionId) => !existingIds.has(permissionId));

  if (missingIds.length > 0) {
    return {
      isValid: false,
      message: "Une ou plusieurs permissions selectionnees n'existent pas."
    };
  }

  return { isValid: true, validIds: permissionIds };
};

const buildRoleResponse = async (role) => {
  const liaisons = await RolePermission.find({ roleId: role._id }).populate("permissionId");
  const permissionsAssociees = liaisons.map((liaison) => liaison.permissionId).filter(Boolean);
  const employeesCount = await Utilisateur.countDocuments({ roleId: role._id });

  return {
    ...role.toObject(),
    permissions: permissionsAssociees,
    employeesCount
  };
};

// ==========================================
// 0. RECUPERER TOUTES LES PERMISSIONS DISPONIBLES
// ==========================================
export const getAvailablePermissions = async (_req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1, nom: 1 });

    return res.status(200).json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error("Erreur getAvailablePermissions :", error);
    return res.status(500).json({ message: "Erreur lors de la recuperation des permissions systeme." });
  }
};

// ==========================================
// 1. CREER UN ROLE
// ==========================================
export const createRole = async (req, res) => {
  try {
    const { nom, description = "", permissions = [] } = req.body;
    const boutiqueId = req.user?.boutiqueId;
    const roleName = typeof nom === "string" ? nom.trim() : "";
    const permissionIds = normalizePermissionIds(permissions);

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
      return res.status(401).json({ message: "Boutique active introuvable dans la session." });
    }

    if (!roleName) {
      return res.status(400).json({ message: "Le nom du role est requis." });
    }

    const permissionValidation = await validatePermissionIds(permissionIds);
    if (!permissionValidation.isValid) {
      return res.status(400).json({ message: permissionValidation.message });
    }

    const roleExistant = await Role.findOne({
      nom: roleName,
      boutiqueId
    });

    if (roleExistant) {
      return res.status(400).json({ message: "Un role avec ce nom existe deja dans votre boutique." });
    }

    const nouveauRole = await Role.create({
      nom: roleName,
      description: typeof description === "string" ? description.trim() : "",
      boutiqueId
    });

    if (permissionIds.length > 0) {
      await RolePermission.insertMany(
        permissionIds.map((permissionId) => ({
          roleId: nouveauRole._id,
          permissionId
        }))
      );
    }

    const roleAvecPermissions = await buildRoleResponse(nouveauRole);

    return res.status(201).json({
      success: true,
      message: "Role cree avec succes !",
      role: roleAvecPermissions
    });
  } catch (error) {
    console.error("Erreur createRole :", error);

    if (error?.code === 11000) {
      return res.status(400).json({ message: "Un role avec ce nom existe deja dans votre boutique." });
    }

    return res.status(500).json({ message: "Erreur lors de la creation du role." });
  }
};

// ==========================================
// 2. RECUPERER TOUS LES ROLES D'UNE BOUTIQUE
// ==========================================
export const getRoles = async (req, res) => {
  try {
    const boutiqueId = req.user?.boutiqueId;

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
      return res.status(401).json({ message: "Boutique active introuvable dans la session." });
    }

    const roles = await Role.find({ boutiqueId }).sort({ createdAt: -1 });
    const rolesAvecPermissions = await Promise.all(roles.map(buildRoleResponse));

    return res.status(200).json({
      success: true,
      roles: rolesAvecPermissions
    });
  } catch (error) {
    console.error("Erreur getRoles :", error);
    return res.status(500).json({ message: "Erreur lors de la recuperation des roles." });
  }
};

// ==========================================
// 3. RECUPERER UN ROLE SPECIFIQUE PAR SON ID
// ==========================================
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user?.boutiqueId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Identifiant du role invalide." });
    }

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
      return res.status(401).json({ message: "Boutique active introuvable dans la session." });
    }

    const role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Role introuvable dans votre boutique." });
    }

    return res.status(200).json({
      success: true,
      role: await buildRoleResponse(role)
    });
  } catch (error) {
    console.error("Erreur getRoleById :", error);
    return res.status(500).json({ message: "Erreur lors de la recuperation du role." });
  }
};

// ==========================================
// 4. MODIFIER UN ROLE ET SES PERMISSIONS
// ==========================================
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, description, permissions } = req.body;
    const boutiqueId = req.user?.boutiqueId;
    const roleName = typeof nom === "string" ? nom.trim() : "";

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Identifiant du role invalide." });
    }

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
      return res.status(401).json({ message: "Boutique active introuvable dans la session." });
    }

    const role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Role introuvable." });
    }

    if (nom !== undefined && !roleName) {
      return res.status(400).json({ message: "Le nom du role est requis." });
    }

    if (roleName && roleName !== role.nom) {
      const doublon = await Role.findOne({
        nom: roleName,
        boutiqueId,
        _id: { $ne: id }
      });

      if (doublon) {
        return res.status(400).json({ message: "Un autre role porte deja ce nom dans votre boutique." });
      }

      role.nom = roleName;
    }

    if (description !== undefined) {
      role.description = typeof description === "string" ? description.trim() : "";
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "La liste des permissions est invalide." });
      }

      const permissionIds = normalizePermissionIds(permissions);
      const permissionValidation = await validatePermissionIds(permissionIds);

      if (!permissionValidation.isValid) {
        return res.status(400).json({ message: permissionValidation.message });
      }

      await RolePermission.deleteMany({ roleId: id });

      if (permissionIds.length > 0) {
        await RolePermission.insertMany(
          permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId
          }))
        );
      }
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Role et permissions mis a jour avec succes !",
      role: await buildRoleResponse(role)
    });
  } catch (error) {
    console.error("Erreur updateRole :", error);

    if (error?.code === 11000) {
      return res.status(400).json({ message: "Un autre role porte deja ce nom dans votre boutique." });
    }

    return res.status(500).json({ message: "Erreur lors de la modification du role." });
  }
};

// ==========================================
// 5. SUPPRIMER UN ROLE
// ==========================================
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user?.boutiqueId;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Identifiant du role invalide." });
    }

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
      return res.status(401).json({ message: "Boutique active introuvable dans la session." });
    }

    const role = await Role.findOne({ _id: id, boutiqueId });
    if (!role) {
      return res.status(404).json({ message: "Role introuvable." });
    }

    const utilisateurAvecCeRole = await Utilisateur.findOne({
      roleId: id,
      boutiqueActive: boutiqueId
    });

    if (utilisateurAvecCeRole) {
      return res.status(400).json({
        message: "Action impossible : ce role est actuellement attribue a un ou plusieurs employes."
      });
    }

    await RolePermission.deleteMany({ roleId: id });
    await Role.deleteOne({ _id: id, boutiqueId });

    return res.status(200).json({
      success: true,
      message: "Role supprime avec succes !"
    });
  } catch (error) {
    console.error("Erreur deleteRole :", error);
    return res.status(500).json({ message: "Erreur lors de la suppression du role." });
  }
};

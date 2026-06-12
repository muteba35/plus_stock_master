import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import { Utilisateur, Role, Departement, Boutique } from "../models/Utilisateur.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getBoutiqueId = (req) => req.user?.boutiqueId || req.user?.boutiqueActive;

const getTargetBoutiqueId = (req) => {
  if (req.user?.isOwner && req.body?.boutiqueId) return req.body.boutiqueId;
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return getBoutiqueId(req);
};

const formatEmploye = (employe) => ({
  id: employe._id,
  firstName: employe.prenom,
  lastName: employe.nom,
  email: employe.email,
  phone: employe.telephone || "",
  avatarUrl: employe.avatar || null,

  roleId: employe.roleId?._id || employe.roleId || null,
  role: employe.roleId?.nom || "Non attribue",

  departementId: employe.departementId?._id || employe.departementId || null,
  department: employe.departementId?.nom || "Non attribue",

  boutiqueId: employe.boutiqueActive?._id || employe.boutiqueActive || null,
  boutique: employe.boutiqueActive?.nom || "",

  status: employe.isBlocked ? "Suspendu" : "Actif",
  createdAt: employe.createdAt
});

const assertBoutique = (boutiqueId) => {
  return boutiqueId && isValidObjectId(boutiqueId);
};

const assertRoleAndDepartementBelongToBoutique = async ({
  roleId,
  departementId,
  boutiqueId
}) => {
  if (!isValidObjectId(roleId)) {
    return { valid: false, message: "Role invalide." };
  }

  if (!isValidObjectId(departementId)) {
    return { valid: false, message: "Departement invalide." };
  }

  const role = await Role.findOne({ _id: roleId, boutiqueId });
  if (!role) {
    return { valid: false, message: "Ce role n'existe pas dans votre boutique." };
  }

  const departement = await Departement.findOne({ _id: departementId, boutiqueId });
  if (!departement) {
    return { valid: false, message: "Ce departement n'existe pas dans votre boutique." };
  }

  return { valid: true };
};

const findEmployeInBoutique = async (id, boutiqueId, populate = false) => {
  if (!isValidObjectId(id)) return null;

  const query = Utilisateur.findOne({
    _id: id,
    boutiqueActive: boutiqueId,
    roleId: { $ne: null }
  }).select("-password");

  if (populate) {
    query.populate("roleId").populate("departementId");
  }

  return query;
};

export const createEmploye = async (req, res) => {
  try {
    const boutiqueId = getTargetBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    const {
      prenom,
      nom,
      firstName,
      lastName,
      email,
      telephone,
      phone,
      roleId,
      departementId,
      password,
      avatar
    } = req.body;

    const cleanPrenom = String(prenom || firstName || "").trim();
    const cleanNom = String(nom || lastName || "").trim();
    const cleanEmail = String(email || "").toLowerCase().trim();
    const cleanPhone = String(telephone || phone || "").trim();

    if (!cleanPrenom || !cleanNom || !cleanEmail || !cleanPhone || !password || !roleId || !departementId) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires."
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe minimum 8 caracteres."
      });
    }

    const boutiqueQuery = { _id: boutiqueId };
    if (req.user?.isOwner) {
      boutiqueQuery.userId = req.user.id;
    }

    const boutique = await Boutique.findOne(boutiqueQuery);
    if (!boutique) {
      return res.status(404).json({
        success: false,
        message: "Boutique introuvable."
      });
    }

    const validation = await assertRoleAndDepartementBelongToBoutique({
      roleId,
      departementId,
      boutiqueId
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const existingUser = await Utilisateur.findOne({
      $or: [{ email: cleanEmail }, { telephone: cleanPhone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email ou telephone deja utilise."
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const employe = await Utilisateur.create({
      prenom: cleanPrenom,
      nom: cleanNom,
      email: cleanEmail,
      telephone: cleanPhone,
      password: hashedPassword,
      avatar: avatar || "",
      roleId,
      departementId,
      boutiqueActive: boutiqueId,
      isActive: true,
      isBlocked: false,
      emailVerifiedAt: new Date()
    });

    const populated = await Utilisateur.findById(employe._id)
      .select("-password")
      .populate("roleId")
      .populate("departementId");

    return res.status(201).json({
      success: true,
      message: "Employe cree avec succes.",
      employe: formatEmploye(populated)
    });
  } catch (error) {
    console.error("createEmploye:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la creation de l'employe."
    });
  }
};

export const getEmployes = async (req, res) => {
  try {
    const boutiqueId = getTargetBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    const employes = await Utilisateur.find({
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    })
      .select("-password")
      .populate("roleId")
      .populate("departementId")
      .populate("boutiqueActive")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      employes: employes.map(formatEmploye)
    });
  } catch (error) {
    console.error("getEmployes:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la recuperation des employes."
    });
  }
};

export const getEmployeById = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await findEmployeInBoutique(id, boutiqueId, true);

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employe introuvable."
      });
    }

    return res.status(200).json({
      success: true,
      employe: formatEmploye(employe)
    });
  } catch (error) {
    console.error("getEmployeById:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la recuperation de l'employe."
    });
  }
};

export const updateEmploye = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employe introuvable."
      });
    }

    const {
      prenom,
      nom,
      firstName,
      lastName,
      email,
      telephone,
      phone,
      roleId,
      departementId,
      avatar
    } = req.body;

    const nextRoleId = roleId || employe.roleId?.toString();
    const nextDepartementId = departementId || employe.departementId?.toString();

    if (roleId || departementId) {
      const validation = await assertRoleAndDepartementBelongToBoutique({
        roleId: nextRoleId,
        departementId: nextDepartementId,
        boutiqueId
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
    }

    const nextEmail = email ? String(email).toLowerCase().trim() : employe.email;
    const nextPhone = telephone || phone ? String(telephone || phone).trim() : employe.telephone;

    const duplicate = await Utilisateur.findOne({
      _id: { $ne: id },
      $or: [{ email: nextEmail }, { telephone: nextPhone }]
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Email ou telephone deja utilise."
      });
    }

    employe.prenom = String(prenom || firstName || employe.prenom).trim();
    employe.nom = String(nom || lastName || employe.nom).trim();
    employe.email = nextEmail;
    employe.telephone = nextPhone;

    if (roleId) employe.roleId = roleId;
    if (departementId) employe.departementId = departementId;
    if (avatar !== undefined) employe.avatar = avatar || "";

    await employe.save();

    const populated = await findEmployeInBoutique(id, boutiqueId, true);

    return res.status(200).json({
      success: true,
      message: "Employe mis a jour avec succes.",
      employe: formatEmploye(populated)
    });
  } catch (error) {
    console.error("updateEmploye:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la modification de l'employe."
    });
  }
};

export const toggleEmployeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employe introuvable."
      });
    }

    employe.isBlocked = !employe.isBlocked;
    await employe.save();

    const populated = await findEmployeInBoutique(id, boutiqueId, true);

    return res.status(200).json({
      success: true,
      message: employe.isBlocked ? "Employe suspendu." : "Employe reactive.",
      employe: formatEmploye(populated)
    });
  } catch (error) {
    console.error("toggleEmployeStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors du changement de statut."
    });
  }
};

export const resetEmployePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    }).select("+loginAttempts +lockUntil");

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employe introuvable."
      });
    }

    const temporaryPassword = `Stock@${crypto.randomInt(100000, 999999)}`;
    employe.password = await bcrypt.hash(temporaryPassword, 12);
    employe.loginAttempts = 0;
    employe.lockUntil = undefined;
    employe.isBlocked = false;

    await employe.save();

    return res.status(200).json({
      success: true,
      message: "Mot de passe reinitialise avec succes.",
      temporaryPassword
    });
  } catch (error) {
    console.error("resetEmployePassword:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la reinitialisation du mot de passe."
    });
  }
};

export const deleteEmploye = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!assertBoutique(boutiqueId)) {
      return res.status(401).json({
        success: false,
        message: "Boutique active introuvable."
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    });

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employe introuvable."
      });
    }

    await Utilisateur.deleteOne({
      _id: id,
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    });

    return res.status(200).json({
      success: true,
      message: "Employe supprime avec succes."
    });
  } catch (error) {
    console.error("deleteEmploye:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de l'employe."
    });
  }
}

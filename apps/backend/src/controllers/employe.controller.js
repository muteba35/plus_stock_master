import crypto from "crypto";
import mongoose from "mongoose";
import { Utilisateur, Role, Departement, Boutique } from "../models/Utilisateur.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ================= FORMAT FRONT =================
const formatEmploye = (employe) => ({
  id: employe._id,
  firstName: employe.prenom,
  lastName: employe.nom,
  email: employe.email,
  phone: employe.telephone || "",
  avatarUrl: employe.avatar || null,

  roleId: employe.roleId?._id || employe.roleId || null,
  role: employe.roleId?.nom || "Non attribué",

  departementId: employe.departementId?._id || employe.departementId || null,
  department: employe.departementId?.nom || "Non attribué",

  status: employe.isBlocked ? "Suspendu" : "Actif",
  createdAt: employe.createdAt
});

// ================= UTILS =================
const getBoutiqueId = (req) =>
  req.user?.boutiqueId || req.user?.boutiqueActive;

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

  const departement = await Departement.findOne({
    _id: departementId,
    boutiqueId
  });

  if (!departement) {
    return {
      valid: false,
      message: "Ce departement n'existe pas dans votre boutique."
    };
  }

  return { valid: true };
};

// ================= CREATE =================
export const createEmploye = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);

    if (!boutiqueId || !isValidObjectId(boutiqueId)) {
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

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe minimum 8 caractères."
      });
    }

    const boutique = await Boutique.findById(boutiqueId);
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
        message: "Email ou téléphone déjà utilisé."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

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
      .populate("roleId")
      .populate("departementId");

    return res.status(201).json({
      success: true,
      message: "Employé créé avec succès.",
      employe: formatEmploye(populated)
    });
  } catch (error) {
    console.error("createEmploye:", error);
    res.status(500).json({ success: false });
  }
};

// ================= GET ALL =================
export const getEmployes = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);

    const employes = await Utilisateur.find({
      boutiqueActive: boutiqueId,
      roleId: { $ne: null }
    })
      .select("-password")
      .populate("roleId")
      .populate("departementId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employes: employes.map(formatEmploye)
    });
  } catch (error) {
    console.error("getEmployes:", error);
    res.status(500).json({ success: false });
  }
};

// ================= GET BY ID ✅ =================
export const getEmployeById = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide."
      });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId
    })
      .select("-password")
      .populate("roleId")
      .populate("departementId");

    if (!employe) {
      return res.status(404).json({
        success: false,
        message: "Employé introuvable."
      });
    }

    res.json({
      success: true,
      employe: formatEmploye(employe)
    });
  } catch (error) {
    console.error("getEmployeById:", error);
    res.status(500).json({ success: false });
  }
};

// ================= UPDATE =================
export const updateEmploye = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = getBoutiqueId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false });
    }

    const employe = await Utilisateur.findOne({
      _id: id,
      boutiqueActive: boutiqueId
    });

    if (!employe) {
      return res.status(404).json({ success: false });
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

    employe.prenom = prenom || firstName || employe.prenom;
    employe.nom = nom || lastName || employe.nom;
    employe.email = email || employe.email;
    employe.telephone = telephone || phone || employe.telephone;

    if (roleId) employe.roleId = roleId;
    if (departementId) employe.departementId = departementId;
    if (avatar !== undefined) employe.avatar = avatar;

    await employe.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

// ================= STATUS =================
export const toggleEmployeStatus = async (req, res) => {
  try {
    const employe = await Utilisateur.findById(req.params.id);
    if (!employe) return res.status(404).json({ success: false });

    employe.isBlocked = !employe.isBlocked;
    await employe.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// ================= RESET PASSWORD =================
export const resetEmployePassword = async (req, res) => {
  try {
    const employe = await Utilisateur.findById(req.params.id);
    if (!employe) return res.status(404).json({ success: false });

    const temp =  `Stock@${crypto.randomInt(100000, 999999)}`;
    employe.password = await bcrypt.hash(temp, 12);
    await employe.save();

    res.json({ success: true, temporaryPassword: temp });
  } catch {
    res.status(500).json({ success: false });
  }
};

// ================= DELETE =================
export const deleteEmploye = async (req, res) => {
  try {
    await Utilisateur.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
};
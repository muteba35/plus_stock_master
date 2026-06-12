import { Boutique, Departement, Utilisateur } from "../models/Utilisateur.js";

const getRequestedBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user.boutiqueActive || req.user.boutiqueId;
};

/**
 * @desc    Récupérer tous les départements de la boutique active
 * @route   GET /api/departements
 * @access  Private (protect + checkPermission('VOIR_DEPARTEMENTS'))
 */
export const getDepartements = async (req, res) => {
  try {
    const boutiqueId = getRequestedBoutiqueId(req);

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Identifiant de la boutique introuvable dans la session utilisateur."
      });
    }

    if (req.user?.isOwner && req.query?.boutiqueId) {
      const boutique = await Boutique.findOne({ _id: boutiqueId, userId: req.user.id, isDeleted: false });
      if (!boutique) {
        return res.status(403).json({
          success: false,
          status: "fail",
          message: "Cette boutique n'appartient pas a votre compte."
        });
      }
    }

    const departements = await Departement.find({ boutiqueId }).sort({ createdAt: -1 });

    // AJOUT : Calculer dynamiquement le nombre d'employés par département
    const deptsAvecCompte = await Promise.all(
      departements.map(async (dept) => {
        // On compte combien d'utilisateurs ont ce departementId
        const count = await Utilisateur.countDocuments({ departementId: dept._id });
        return {
          ...dept.toObject(),
          employeeCount: count // Envoyé au frontend !
        };
      })
    );

    res.status(200).json({
      success: true,
      status: "success",
      results: deptsAvecCompte.length,
      data: deptsAvecCompte // On envoie les départements enrichis du compteur
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Une erreur est survenue lors de la récupération des départements.",
      error: error.message
    });
  }
};

/**
 * @desc    Créer un nouveau département dans la boutique active
 * @route   POST /api/departements
 * @access  Private (protect + checkPermission('GERER_DEPARTEMENTS'))
 */
export const createDepartement = async (req, res) => {
  try {
    const { nom, description } = req.body;
    const boutiqueId = req.user.boutiqueActive || req.user.boutiqueId;

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Impossible de créer le département : boutique introuvable."
      });
    }

    if (!nom) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Le nom du département est obligatoire."
      });
    }

    const existingDept = await Departement.findOne({ nom: nom.trim(), boutiqueId });
    if (existingDept) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Ce département existe déjà dans votre boutique."
      });
    }

    const newDepartement = await Departement.create({
      nom: nom.trim(),
      description: description ? description.trim() : "",
      boutiqueId
    });

    res.status(201).json({
      success: true,
      status: "success",
      message: "Département créé avec succès !",
      data: newDepartement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Impossible de créer le département.",
      error: error.message
    });
  }
};

/**
 * @desc    Modifier un département existant au sein de sa boutique
 * @route   PUT /api/departements/:id
 * @access  Private (protect + checkPermission('GERER_DEPARTEMENTS'))
 */
export const updateDepartement = async (req, res) => {
  try {
    const { nom, description } = req.body;
    const { id } = req.params;
    const boutiqueId = req.user.boutiqueActive || req.user.boutiqueId;

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Action impossible : boutique introuvable."
      });
    }

    const departement = await Departement.findOne({ _id: id, boutiqueId });
    if (!departement) {
      return res.status(404).json({
        success: false,
        status: "fail",
        message: "Département introuvable ou vous n'avez pas l'autorisation de le modifier."
      });
    }

    if (nom && nom.trim() !== departement.nom) {
      const duplicate = await Departement.findOne({ nom: nom.trim(), boutiqueId });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          status: "fail",
          message: "Un autre département de votre boutique porte déjà ce nom."
        });
      }
      departement.nom = nom.trim();
    }

    if (description !== undefined) {
      departement.description = description.trim();
    }

    await departement.save();

    res.status(200).json({
      success: true,
      status: "success",
      message: "Département mis à jour avec succès !",
      data: departement 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Erreur lors de la mise à jour du département.",
      error: error.message
    });
  }
};

/**
 * @desc    Récupérer un département spécifique par son ID
 * @route   GET /api/departements/:id
 * @access  Private (protect + checkPermission('VOIR_DEPARTEMENTS'))
 */
export const getDepartementById = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user.boutiqueActive || req.user.boutiqueId;

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Action impossible : boutique introuvable."
      });
    }

    const departement = await Departement.findOne({ _id: id, boutiqueId });

    if (!departement) {
      return res.status(404).json({
        success: false,
        status: "fail",
        message: "Département introuvable ou vous n'avez pas l'autorisation d'y accéder."
      });
    }

    res.status(200).json({
      success: true,
      status: "success",
      data: departement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Erreur lors de la récupération du département.",
      error: error.message
    });
  }
};

/**
 * @desc    Supprimer un département au sein de sa boutique
 * @route   DELETE /api/departements/:id
 * @access  Private (protect + checkPermission('GERER_DEPARTEMENTS'))
 */
export const deleteDepartement = async (req, res) => {
  try {
    const { id } = req.params;
    const boutiqueId = req.user.boutiqueActive || req.user.boutiqueId;

    if (!boutiqueId) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Action impossible : boutique introuvable."
      });
    }

    // AJOUT SÉCURITÉ : Vérifier s'il y a des employés dans ce département
    const employesDansCeDept = await Utilisateur.findOne({ departementId: id });
    if (employesDansCeDept) {
      return res.status(400).json({
        success: false,
        status: "fail",
        message: "Action impossible : Ce département contient encore des employés."
      });
    }

    const deletedDept = await Departement.findOneAndDelete({ _id: id, boutiqueId });

    if (!deletedDept) {
      return res.status(404).json({
        success: false,
        status: "fail",
        message: "Département introuvable, déjà supprimé ou accès refusé."
      });
    }

    res.status(200).json({
      success: true,
      status: "success",
      message: "Le département a été supprimé avec succès !"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      message: "Erreur lors de la suppression du département.",
      error: error.message
    });
  }
};

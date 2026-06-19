import jwt from "jsonwebtoken";
import { Utilisateur, Permission, RolePermission } from "../models/Utilisateur.js";

const buildUserPermissions = async (user) => {
  const boutiqueActive = user.boutiqueActive;
  const isOwner = boutiqueActive?.userId?.toString() === user._id.toString();

  if (isOwner) {
    const permissions = await Permission.find({});
    return permissions.map((permission) => permission.nom);
  }

  if (!user.roleId) return [];

  const rolePermissions = await RolePermission.find({ roleId: user.roleId }).populate("permissionId");
  return rolePermissions
    .map((rolePermission) => rolePermission.permissionId?.nom)
    .filter(Boolean);
};

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Acces refuse. Aucun token fourni." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Utilisateur.findById(decoded.id)
      .select("+isPermanentlyBlocked +mustChangePassword")
      .populate("boutiqueActive");

    if (!user) {
      return res.status(401).json({ message: "Session invalide. Utilisateur introuvable." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Compte inactif. Veuillez activer votre compte." });
    }

    if (user.isBlocked || user.isPermanentlyBlocked) {
      return res.status(403).json({ message: "Compte suspendu. Contactez un administrateur." });
    }

    const isPasswordChangeRoute = req.originalUrl?.startsWith("/api/auth/update-password");
    if (user.mustChangePassword && !isPasswordChangeRoute) {
      return res.status(428).json({
        message: "Vous devez remplacer votre mot de passe temporaire avant de continuer.",
        mustChangePassword: true,
      });
    }

    const permissions = await buildUserPermissions(user);
    const boutiqueId = user.boutiqueActive?._id || user.boutiqueActive || decoded.boutiqueId;
    const isOwner = !user.roleId && (
      !user.boutiqueActive || user.boutiqueActive.userId?.toString() === user._id.toString()
    );

    req.user = {
      ...decoded,
      id: user._id.toString(),
      _id: user._id,
      boutiqueId,
      boutiqueActive: boutiqueId,
      isOwner,
      mustChangePassword: Boolean(user.mustChangePassword),
      permissions,
    };

    return next();
  } catch (error) {
    console.error("JWT AUTH ERROR:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Votre session a expire. Veuillez vous reconnecter.",
      });
    }

    return res.status(401).json({ message: "Acces refuse. Token invalide ou altere." });
  }
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ message: "Action non autorisee. Profil non identifie." });
    }

    const hasAccess = req.user.isOwner || req.user.permissions.includes(requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({
        message: `Acces interdit. Vous n'avez pas le droit requis [${requiredPermission}] pour effectuer cette action.`,
      });
    }

    return next();
  };
};

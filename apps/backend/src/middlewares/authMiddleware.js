import jwt from "jsonwebtoken";

/**
 * Middleware de protection global - Vérifie la validité du JWT
 */
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Extraction et vérification immédiate du format du Header (Early Return)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Accès refusé. Aucun token fourni." });
  }

  // 2. Récupération du token
  const token = authHeader.split(" ")[1];

  try {
    // 3. Vérification de la signature du token avec le secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Injection des données dans l'objet 'req' 
    // Contient désormais : req.user.id, req.user.boutiqueId, et req.user.permissions
    req.user = decoded;

    return next();
  } catch (error) {
    console.error("JWT AUTH ERROR:", error.message);

    // Distinction hyper importante pour ton frontend (pour vider les stores/cookies)
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Votre session a expiré. Veuillez vous reconnecter." 
      });
    }

    return res.status(401).json({ message: "Accès refusé. Token invalide ou altéré." });
  }
};

/**
 * Middleware d'autorisation dynamique - Vérifie si l'utilisateur possède la permission requise
 * @param {string} requiredPermission - Le nom de la permission (ex: "CREER_PRODUIT")
 */
export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // 1. On s'assure que le middleware 'protect' est bien passé avant
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ message: "Action non autorisée. Profil non identifié." });
    }

    // 2. RÈGLE D'OR : On vérifie si la permission demandée est présente dans le tableau du JWT
    const hasAccess = req.user.permissions.includes(requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({ 
        message: `Accès interdit. Vous n'avez pas le droit requis [${requiredPermission}] pour effectuer cette action.` 
      });
    }

    // 3. Tout est OK, on passe au contrôleur
    return next();
  };
};
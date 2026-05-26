import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
  let token;

  // 1. On vérifie si le token est présent dans les headers de la requête
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // 2. On extrait le token (on enlève le mot "Bearer ")
      token = req.headers.authorization.split(" ")[1];

      // 3. On utilise ton JWT_SECRET pour vérifier la signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. On ajoute les infos du token (id, role, boutiqueId) à l'objet 'req'
      req.user = decoded;

      // On laisse passer la requête vers la route ou le contrôleur suivant
      return next(); 
    } catch (error) {
      console.error("TOKEN ERROR:", error);
      return res.status(401).json({ message: "Non autorisé, token invalide" });
    }
  }

  // 5. Si on arrive ici, c'est qu'aucun token n'a été trouvé dans les headers
  if (!token) {
    return res.status(401).json({ message: "Non autorisé, aucun token fourni" });
  }
};
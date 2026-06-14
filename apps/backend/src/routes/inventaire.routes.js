import express from "express";

const router = express.Router();

// Route principale : /api/inventaire
// Renvoie des données statiques pour que tu puisses tester ton front-end
router.get("/", (req, res) => {
  res.status(200).json({
    message: "Succès",
    data: {
      totalProduits: 1245,
      alertes: 12,
      mouvementsAujourdhui: 45,
      categoriesActives: 24,
      produits: [
        { id: 1, nom: "MacBook Pro M2", sku: "LAP-MBP-001", categorie: "Électronique", prix: 1299.00, stock: 45 },
        { id: 2, nom: "Clavier Mécanique", sku: "ACC-KEY-002", categorie: "Périphériques", prix: 89.00, stock: 12 }
      ]
    }
  });
});

// Tu pourras décommenter et configurer ces routes quand tu connecteras la DB
/*
router.get("/produits", ...);
router.post("/produits", ...);
router.get("/categories", ...);
router.get("/alertes", ...);
*/

export default router;
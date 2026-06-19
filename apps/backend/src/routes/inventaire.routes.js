import express from "express";
import categorieRoutes from "./categorie.routes.js";
import produitRoutes from "./produit.routes.js";

const router = express.Router();

router.use("/categories", categorieRoutes);
router.use("/produits", produitRoutes);

// Route principale : /api/inventaire
// Donnees statiques temporaires pour tester le frontend avant la connexion DB.
router.get("/", (req, res) => {
  res.status(200).json({
    message: "Succes",
    data: {
      totalProduits: 1245,
      alertes: 12,
      mouvementsAujourdhui: 45,
      categoriesActives: 24,
      produits: [
        {
          id: 1,
          nom: "MacBook Pro M2",
          sku: "LAP-MBP-001",
          categorie: "Electronique",
          prix: 1299.0,
          stock: 45,
        },
        {
          id: 2,
          nom: "Clavier Mecanique",
          sku: "ACC-KEY-002",
          categorie: "Peripheriques",
          prix: 89.0,
          stock: 12,
        },
      ],
    },
  });
});

// Ces routes seront branchees a la base de donnees quand le module inventaire sera implemente.
// router.get("/produits", ...);
// router.post("/produits", ...);
// router.get("/categories", ...);
// router.get("/alertes", ...);

export default router;

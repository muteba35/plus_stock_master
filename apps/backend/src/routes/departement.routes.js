import express from 'express';
import { 
  createDepartement, 
  getDepartements, 
  getDepartementById, 
  updateDepartement, 
  deleteDepartement 
} from '../controllers/departement.controller.js'; 

import { protect, checkPermission, checkAnyPermission } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Sécurisation globale : l'utilisateur doit être connecté
router.use(protect);

// 1. Créer et Lire sur la racine
router.route('/')
  .post(checkPermission('CREER_DEPARTEMENT'), createDepartement) // La secrétaire aura ça
  .get(checkAnyPermission('VOIR_DEPARTEMENTS', 'VOIR_EQUIPE'), getDepartements);

// 2. Actions par ID
router.route('/:id')
  .get(checkPermission('VOIR_DEPARTEMENTS'), getDepartementById)
  .put(checkPermission('MODIFIER_DEPARTEMENT'), updateDepartement) // La secrétaire n'aura pas ça
  .delete(checkPermission('SUPPRIMER_DEPARTEMENT'), deleteDepartement); // La secrétaire n'aura pas ça

export default router;

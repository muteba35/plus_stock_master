import express from 'express';
import { 
  createDepartement, 
  getDepartements, 
  getDepartementById, 
  updateDepartement, 
  deleteDepartement 
} from '../controllers/departement.controller.js'; 

import { protect, checkPermission, checkAnyPermission } from '../middlewares/authMiddleware.js';
import { attachSubscription, requireFeature } from '../middlewares/subscriptionMiddleware.js';

const router = express.Router();

// Sécurisation globale : l'utilisateur doit être connecté
router.use(protect);
router.use(attachSubscription);

// 1. Créer et Lire sur la racine
router.route('/')
  .post(requireFeature('DEPARTMENTS', 'Pro'), checkPermission('CREER_DEPARTEMENT'), createDepartement) // La secrétaire aura ça
  .get(requireFeature('DEPARTMENTS', 'Pro'), checkAnyPermission('VOIR_DEPARTEMENTS', 'VOIR_EQUIPE'), getDepartements);

// 2. Actions par ID
router.route('/:id')
  .get(requireFeature('DEPARTMENTS', 'Pro'), checkPermission('VOIR_DEPARTEMENTS'), getDepartementById)
  .put(requireFeature('DEPARTMENTS', 'Pro'), checkPermission('MODIFIER_DEPARTEMENT'), updateDepartement) // La secrétaire n'aura pas ça
  .delete(requireFeature('DEPARTMENTS', 'Pro'), checkPermission('SUPPRIMER_DEPARTEMENT'), deleteDepartement); // La secrétaire n'aura pas ça

export default router;

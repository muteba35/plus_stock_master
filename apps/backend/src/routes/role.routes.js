import express from 'express';
import { 
  createRole, 
  getRoles, 
  getRoleById, 
  updateRole, 
  deleteRole,
  getAvailablePermissions // Fonction pour alimenter le formulaire du Front
} from '../controllers/role.controller.js'; 

// Middlewares de sécurité
import { protect, checkPermission, checkAnyPermission } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Toutes les routes ci-dessous nécessitent obligatoirement un token JWT valide
router.use(protect);

// ==========================================
// ROUTES POUR LES PERMISSIONS
// ==========================================
// On laisse "VOIR_ROLES" ici car pour afficher les détails d'un rôle, 
// on a souvent besoin de charger la liste des permissions existantes.
router.get('/permissions', checkPermission('VOIR_ROLES'), getAvailablePermissions);

// ==========================================
// ROUTES POUR LES RÔLES
// ==========================================

// 1. Créer un rôle & Récupérer tous les rôles de la boutique active
router.route('/')
  .post(checkPermission('CREER_ROLE'), createRole) // Granularité : Création
  .get(checkAnyPermission('VOIR_ROLES', 'VOIR_EQUIPE'), getRoles);

// 2. Récupérer, Modifier ou Supprimer un rôle spécifique via son ID
router.route('/:id')
  .get(checkPermission('VOIR_ROLES'), getRoleById)
  .put(checkPermission('MODIFIER_ROLE'), updateRole) // Granularité : Modification
  .delete(checkPermission('SUPPRIMER_ROLE'), deleteRole); // Granularité : Suppression

export default router;

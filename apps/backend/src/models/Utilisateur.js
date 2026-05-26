import mongoose from 'mongoose';

// ==========================================
// 1. SCHÉMA PERMISSION
// ==========================================
// Contient la liste exhaustive des actions possibles dans le système.
// Ce schéma est statique et alimenté au démarrage du projet.
const permissionSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true, 
    unique: true // ex: "EFFECTUER_VENTE", "VOIR_RAPPORTS"
  },
  module: { 
    type: String, 
    required: true // Regroupe par menu : "VENTE", "INVENTAIRE", "RH"
  },
  description: { 
    type: String // Explication de ce que la permission autorise
  }
});

// ==========================================
// 2. SCHÉMA ROLE
// ==========================================
// Défini par le propriétaire de la boutique. 
// Lie un nom de métier (ex: "Caissier") à une liste de permissions.
const roleSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true 
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Boutique",
    required: true
  },
  // Tableau d'IDs pointant vers la collection Permission
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission"
  }]
}, { timestamps: true });

// Index unique : empêche d'avoir deux rôles "Vendeur" dans la même boutique
roleSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });

// ==========================================
// 3. SCHÉMA UTILISATEUR
// ==========================================
const utilisateurSchema = new mongoose.Schema(
  {
    // --- IDENTITÉ ---
    nom: { type: String, required: [true, "Le nom est requis"], trim: true },
    prenom: { type: String, required: [true, "Le prénom est requis"], trim: true },
    email: { 
      type: String, 
      required: [true, "L'email est requis"], 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    telephone: { type: String, trim: true },

    // --- COORDONNÉES COMPLÉMENTAIRES & FISCALITÉ ---
    city: { 
      type: String, 
      trim: true, 
      default: "" // Ville / Commune
    },
    taxId: { 
      type: String, 
      trim: true, 
      default: "" // Numéro National Impôt (TAX ID)
    },
    postalCode: { 
      type: String, 
      trim: true, 
      default: "N/A" // Code Postal (Défaut à "N/A" si non renseigné)
    },
    avatar: { 
      type: String, 
      default: "" // Photo de l'utilisateur (URL ou Base64 string)
    },

    // --- HIÉRARCHIE & RBAC ---
    role: {
      type: String,
      enum: ["admin_system", "proprietaire"],
      default: "proprietaire",
    },
    // Référence au rôle personnalisé créé par le propriétaire (si employé)
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role"
    },
    // La boutique sur laquelle l'utilisateur travaille actuellement
    boutiqueActive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Boutique",
    },

    // --- SÉCURITÉ ---
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 8,
      select: false,
    },
    isActive: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isPermanentlyBlocked: { type: Boolean, default: false },

    // --- VÉRIFICATION & OTP ---
    activationToken: { type: String, select: false },
    activationTokenExpires: { type: Date, select: false },
    emailVerifiedAt: { type: Date, default: null },
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },

    // --- RÉINITIALISATION DE MOT DE PASSE (FORGOT PASSWORD) ---
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // --- ANTI-BRUTE FORCE ---
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

// ==========================================
// 4. SCHÉMA BOUTIQUE
// ==========================================
const boutiqueSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de la boutique est requis"],
      trim: true,
    },
    // Propriétaire de la boutique (Lien Maître)
    proprietaireId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utilisateur",
      required: true,
    },
    secteurActivite: {
      type: String,
      required: [true, "Le secteur d'activité est requis"],
      enum: [
        "Commerce Général", "Supermarché", "Pharmacie", "Restaurant", 
        "Fast-food", "Bar", "Café", "Boutique de vêtements", 
        "Salon de coiffure", "Quincaillerie", "Autre"
      ],
    },
    deviseParDefaut: {
      type: String,
      required: true,
      enum: ["USD ($)", "CDF (FC)", "EUR (€)"],
      default: "USD ($)",
    },
    tailleBusiness: {
      type: String,
      enum: ["1-2 employés", "3-10 employés", "10+ employés"],
    },

    // --- ABONNEMENT ---
    plan: {
      type: String,
      enum: ["Free", "Moyenne", "Premium"],
      default: "Free",
    },
    statutPaiement: {
      type: String,
      enum: ["A jour", "En retard", "Essai"],
      default: "Essai",
    },
    trialExpiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ==========================================
// EXPORTS DES MODÈLES
// ==========================================
const Permission = mongoose.model("Permission", permissionSchema);
const Role = mongoose.model("Role", roleSchema);
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);
const Boutique = mongoose.model("Boutique", boutiqueSchema);

export { Permission, Role, Utilisateur, Boutique };
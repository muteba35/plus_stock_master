import mongoose from 'mongoose';

// ==========================================
// 1. SCHÉMA PERMISSION (Inchangé)
// ==========================================
const permissionSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true, 
    unique: true // ex: "EFFECTUER_VENTE", "VOIR_RAPPORTS"
  },
  module: { 
    type: String, 
    required: true // ex: "VENTE", "INVENTAIRE", "RH"
  },
  description: { 
    type: String 
  }
});

// ==========================================
// 2. SCHÉMA ROLE (Nettoyé)
// ==========================================
const roleSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true // ex: "Responsable Entrées", "Caissier"
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Boutique",
    required: true
  }
}, { timestamps: true });

// Index unique pour éviter les doublons de rôles au sein d'une même boutique
roleSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });

// ==========================================
// 3. SCHÉMA INTERMÉDIAIRE : ROLE PERMISSION
// ==========================================
const rolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Permission",
    required: true
  }
}, { timestamps: true });

// Index composé unique pour éviter d'associer deux fois la même permission au même rôle
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

// ==========================================
// 4. SCHÉMA DÉPARTEMENT (Nouveau)
// ==========================================
const departementSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, "Le nom du département est requis"],
    trim: true // ex: "Finance", "Caisse", "Logistique", "Ressources Humaines"
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Boutique",
    required: true // Chaque boutique gère ses propres départements
  },
  description: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

// Index unique pour éviter d'avoir deux départements avec le même nom dans une même boutique
departementSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });

// ==========================================
// 5. SCHÉMA UTILISATEUR (Mis à jour 🔄)
// ==========================================
const utilisateurSchema = new mongoose.Schema(
  {
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

    city: { type: String, trim: true, default: "" },
    taxId: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "N/A" },
    avatar: { type: String, default: "" },

    // Liaison vers le rôle (si employé)
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null
    },
    
    // Nouvelle liaison vers le département de l'employé
    departementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departement",
      default: null // Reste null pour le super-admin (propriétaire de la boutique)
    },

    boutiqueActive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Boutique",
    },

    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 8,
      select: false,
    },
    isActive: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isPermanentlyBlocked: { type: Boolean, default: false },

    activationToken: { type: String, select: false },
    activationTokenExpires: { type: Date, select: false },
    emailVerifiedAt: { type: Date, default: null },
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

// ==========================================
// 6. SCHÉMA BOUTIQUE
// ==========================================
const boutiqueSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, "Le nom de la boutique est requis"],
      trim: true,
    },
    userId: {
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

    plan: { type: String, enum: ["Free", "Moyenne", "Premium"], default: "Free" },
    statutPaiement: { type: String, enum: ["A jour", "En retard", "Essai"], default: "Essai" },
    trialExpiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000),
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Permission = mongoose.model("Permission", permissionSchema);
const Role = mongoose.model("Role", roleSchema);
const RolePermission = mongoose.model("RolePermission", rolePermissionSchema);
const Departement = mongoose.model("Departement", departementSchema); // Initialisation du modèle
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);
const Boutique = mongoose.model("Boutique", boutiqueSchema);

export { Permission, Role, RolePermission, Departement, Utilisateur, Boutique };
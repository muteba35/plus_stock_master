import mongoose from 'mongoose';

// ==========================================
// 1. SCHÉMA PERMISSION (Inchangé)
// ==========================================
const permissionSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true, 
    unique: true
  },
  module: { 
    type: String, 
    required: true
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
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Boutique",
    required: true
  }
}, { timestamps: true });

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

rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

// ==========================================
// 4. SCHÉMA DÉPARTEMENT (Nouveau)
// ==========================================
const departementSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, "Le nom du département est requis"],
    trim: true
  },
  boutiqueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Boutique",
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

departementSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });

// ==========================================
// 5. SCHÉMA UTILISATEUR (Mis à jour)
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

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null
    },
    
    departementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departement",
      default: null
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

    passwordHistory: {
      type: [
        {
          hash: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
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
    temporaryAccessPassword: { type: String, select: false },
    firstLoginToken: { type: String, select: false },
    mustChangePassword: { type: Boolean, default: false },

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
const Departement = mongoose.model("Departement", departementSchema);
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);
const Boutique = mongoose.model("Boutique", boutiqueSchema);

export { Permission, Role, RolePermission, Departement, Utilisateur, Boutique };
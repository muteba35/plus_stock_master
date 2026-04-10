import mongoose from 'mongoose';

/**
 * Schéma Utilisateur complet pour StockMaster Pro
 * Ce modèle centralise l'identité civile, les paramètres du commerce et 
 * les mécanismes de sécurité (Vérification, Anti-Brute Force).
 */
const utilisateurSchema = new mongoose.Schema(
  {
    // --- IDENTITÉ PERSONNELLE (CIVIL) ---
    nom: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
    },
    postnom: {
      type: String,
      required: [true, "Le postnom est requis"],
      trim: true,
    },
    prenom: {
      type: String,
      required: [true, "Le prénom est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true, // Index unique pour éviter les doublons au niveau BD
      lowercase: true, // Normalisation en minuscules
      trim: true,
    },
    telephone: {
      type: String,
      trim: true,
      // Optionnel dans le formulaire d'inscription
    },

    // --- CONFIGURATION DU BUSINESS (Lien avec la Boutique) ---
    nomBoutique: {
      type: String,
      required: [true, "Le nom de la boutique est requis"],
      trim: true,
    },
    secteurActivite: {
      type: String,
      required: [true, "Le secteur d'activité est requis"],
      // Liste stricte basée sur les options de ton formulaire React
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
      // Ce champ aide à segmenter les besoins de l'utilisateur
    },

    // --- SÉCURITÉ & AUTHENTIFICATION ---
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: 8,
      select: false, // Sécurité OWASP : Ne jamais inclure dans les réponses JSON par défaut
    },
    isActive: {
      type: Boolean,
      default: false, // Le compte reste inactif jusqu'à validation de l'OTP
    },
    isBlocked: {
      type: Boolean,
      default: false, // Permet de bannir un utilisateur manuellement si nécessaire
    },

    // --- MÉCANISMES DE VÉRIFICATION (OTP) ---
    activationToken: { 
      type: String, 
      select: false // Hash du code OTP (5 ou 6 chiffres)
    },
    activationTokenExpires: { 
      type: Date, 
      select: false // Timing serré (ex: 3 minutes) comme discuté
    },
    emailVerifiedAt: { 
      type: Date, 
      default: null // Preuve d'audit du moment de validation
    },

    // --- PROTECTION ANTI-BRUTE FORCE ---
    loginAttempts: { 
      type: Number, 
      default: 0, 
      select: false // Compteur d'échecs successifs
    },
    lockUntil: { 
      type: Date, 
      select: false // Date de fin de blocage temporaire (ex: +15 min)
    },
  },
  { 
    // Génère automatiquement les champs 'createdAt' et 'updatedAt'
    timestamps: true 
  }
);

// Création du modèle basé sur le schéma
const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);

export default Utilisateur;
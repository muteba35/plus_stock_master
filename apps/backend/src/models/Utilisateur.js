import mongoose from "mongoose";





const permissionSchema = new mongoose.Schema({


  nom: {


    type: String,


    required: true,


    unique: true,


  },


  module: {


    type: String,


    required: true,


  },


  description: {


    type: String,


  },


});





const roleSchema = new mongoose.Schema(


  {


    nom: {


      type: String,


      required: true,


      trim: true,


    },


    description: {


      type: String,


      trim: true,


      default: "",


    },


    boutiqueId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Boutique",


      required: true,


    },


  },


  { timestamps: true }


);





roleSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });





const rolePermissionSchema = new mongoose.Schema(


  {


    roleId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Role",


      required: true,


    },


    permissionId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Permission",


      required: true,


    },


  },


  { timestamps: true }


);





rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });





const departementSchema = new mongoose.Schema(


  {


    nom: {


      type: String,


      required: [true, "Le nom du departement est requis"],


      trim: true,


    },


    boutiqueId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Boutique",


      required: true,


    },


    description: {


      type: String,


      trim: true,


      default: "",


    },


  },


  { timestamps: true }


);





departementSchema.index({ nom: 1, boutiqueId: 1 }, { unique: true });



const categorieSchema = new mongoose.Schema(

  {

    nom: {

      type: String,

      required: [true, "Le nom de la categorie est requis"],

      trim: true,

      maxlength: 100,

    },

    description: {

      type: String,

      trim: true,

      default: "",

      maxlength: 500,

    },

    couleur: {

      type: String,

      default: "#6366f1",

      match: [/^#[0-9A-Fa-f]{6}$/, "La couleur doit etre au format hexadecimal"],

    },

    boutiqueId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Boutique",

      required: true,

    },

    isActive: { type: Boolean, default: true },

  },

  { timestamps: true }

);



categorieSchema.index(

  { boutiqueId: 1, nom: 1 },

  { unique: true, collation: { locale: "fr", strength: 2 } }

);



const produitSchema = new mongoose.Schema(

  {

    nom: { type: String, required: [true, "Le nom du produit est requis"], trim: true, maxlength: 150 },

    sku: { type: String, required: [true, "Le SKU est requis"], trim: true, uppercase: true, maxlength: 80 },

    description: { type: String, trim: true, default: "", maxlength: 1000 },

    categorieId: { type: mongoose.Schema.Types.ObjectId, ref: "Categorie", required: true },

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true },

    prixAchat: { type: Number, min: 0, default: 0, select: false },

    prixVente: { type: Number, required: true, min: 0 },

    devise: {

      type: String,

      enum: ["USD ($)", "CDF (FC)", "EUR (€)"],

      default: "USD ($)",

      required: true,

    },

    stock: { type: Number, min: 0, default: 0 },

    seuilAlerte: { type: Number, min: 0, default: 5 },

    unite: { type: String, trim: true, default: "Pièce", maxlength: 30 },

    codeBarres: { type: String, trim: true, default: "", maxlength: 100 },

    image: { type: String, default: "" },

    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false, select: false },

  },

  { timestamps: true }

);



produitSchema.index({ boutiqueId: 1, sku: 1 }, { unique: true });

produitSchema.index(

  { boutiqueId: 1, codeBarres: 1 },

  { unique: true, partialFilterExpression: { codeBarres: { $type: "string", $gt: "" } } }

);

produitSchema.index({ boutiqueId: 1, categorieId: 1, isDeleted: 1 });



const mouvementStockSchema = new mongoose.Schema(

  {

    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "Produit", required: true },

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true },

    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },

    type: { type: String, enum: ["ENTREE", "SORTIE", "AJUSTEMENT"], required: true },

    quantite: { type: Number, required: true, min: 0 },

    variation: { type: Number, required: true },

    stockAvant: { type: Number, required: true, min: 0 },

    stockApres: { type: Number, required: true, min: 0 },

    motif: { type: String, required: true, trim: true, maxlength: 300 },

    reference: { type: String, trim: true, default: "" },

  },

  { timestamps: true }

);



mouvementStockSchema.index({ boutiqueId: 1, produitId: 1, createdAt: -1 });



const inventaireAuditSchema = new mongoose.Schema(

  {

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true },

    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },

    action: { type: String, required: true, trim: true },

    entityType: { type: String, required: true, trim: true },

    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },

    label: { type: String, required: true, trim: true, maxlength: 250 },

    details: { type: mongoose.Schema.Types.Mixed, default: {} },

  },

  { timestamps: true }

);



inventaireAuditSchema.index({ boutiqueId: 1, createdAt: -1 });




const venteLineSchema = new mongoose.Schema(

  {

    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "Produit", required: true },

    nomProduit: { type: String, required: true, trim: true },

    sku: { type: String, trim: true, default: "" },

    quantite: { type: Number, required: true, min: 0 },

    prixUnitaireHT: { type: Number, required: true, min: 0 },

    prixUnitaireTTC: { type: Number, required: true, min: 0 },

    totalHT: { type: Number, required: true, min: 0 },

    totalTTC: { type: Number, required: true, min: 0 },

    stockAvant: { type: Number, required: true, min: 0 },

    stockApres: { type: Number, required: true, min: 0 },

  },

  { _id: false }

);



const venteSchema = new mongoose.Schema(

  {

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true },

    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },

    reference: { type: String, required: true, unique: true, trim: true },

    factureReference: { type: String, required: true, unique: true, trim: true },

    clientNom: { type: String, trim: true, default: "Client comptoir" },

    devise: {

      type: String,

      enum: ["USD ($)", "CDF (FC)", "EUR (€)"],

      required: true,

      default: "USD ($)",

    },

    paiement: { type: String, enum: ["Espèces", "Carte", "Mobile"], required: true },

    statut: { type: String, enum: ["PAYEE", "ANNULEE", "REMBOURSEE"], default: "PAYEE" },

    sousTotalHT: { type: Number, required: true, min: 0 },

    remisePourcentage: { type: Number, default: 0, min: 0, max: 100 },

    remiseMontant: { type: Number, default: 0, min: 0 },

    taxableAmount: { type: Number, required: true, min: 0 },

    tvaRate: { type: Number, default: 0.16, min: 0 },

    tvaMontant: { type: Number, required: true, min: 0 },

    totalTTC: { type: Number, required: true, min: 0 },

    coutTotal: { type: Number, default: 0, min: 0, select: false },

    margeEstimee: { type: Number, default: 0, select: false },

    montantRecu: { type: Number, default: 0, min: 0 },

    monnaieRendue: { type: Number, default: 0, min: 0 },

    lignes: { type: [venteLineSchema], default: [] },

  },

  { timestamps: true }

);



venteSchema.index({ boutiqueId: 1, createdAt: -1 });

venteSchema.index({ boutiqueId: 1, utilisateurId: 1, createdAt: -1 });





const retourClientLineSchema = new mongoose.Schema(

  {

    produitId: { type: mongoose.Schema.Types.ObjectId, ref: "Produit", required: true },

    nomProduit: { type: String, required: true, trim: true },

    sku: { type: String, trim: true, default: "" },

    quantite: { type: Number, required: true, min: 1 },

    montantTTC: { type: Number, required: true, min: 0 },

    remiseEnStock: { type: Boolean, default: false },

  },

  { _id: false }

);



const retourClientSchema = new mongoose.Schema(

  {

    boutiqueId: { type: mongoose.Schema.Types.ObjectId, ref: "Boutique", required: true },

    venteId: { type: mongoose.Schema.Types.ObjectId, ref: "Vente", required: true },

    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true },

    reference: { type: String, required: true, unique: true, trim: true },

    venteReference: { type: String, trim: true, default: "" },

    factureReference: { type: String, trim: true, default: "" },

    clientNom: { type: String, trim: true, default: "Client comptoir" },

    devise: {

      type: String,

      enum: ["USD ($)", "CDF (FC)", "EUR (€)"],

      required: true,

      default: "USD ($)",

    },

    typeRetour: {

      type: String,

      enum: ["REMBOURSEMENT", "ECHANGE", "AVOIR"],

      default: "REMBOURSEMENT",

    },

    motif: { type: String, required: true, trim: true, maxlength: 400 },

    statut: { type: String, enum: ["VALIDE", "REFUSE"], default: "VALIDE" },

    montantTotalTTC: { type: Number, required: true, min: 0 },

    lignes: { type: [retourClientLineSchema], default: [] },

  },

  { timestamps: true }

);



retourClientSchema.index({ boutiqueId: 1, createdAt: -1 });

retourClientSchema.index({ boutiqueId: 1, venteId: 1 });



const utilisateurSchema = new mongoose.Schema(


  {


    nom: { type: String, required: [true, "Le nom est requis"], trim: true },


    prenom: { type: String, required: [true, "Le prenom est requis"], trim: true },


    email: {


      type: String,


      required: [true, "L'email est requis"],


      unique: true,


      lowercase: true,


      trim: true,


    },


    telephone: { type: String, trim: true },


    city: { type: String, trim: true, default: "" },


    taxId: { type: String, trim: true, default: "" },


    postalCode: { type: String, trim: true, default: "N/A" },


    avatar: { type: String, default: "" },


    roleId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Role",


      default: null,


    },


    departementId: {


      type: mongoose.Schema.Types.ObjectId,


      ref: "Departement",


      default: null,


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


      required: [true, "Le secteur d'activite est requis"],


      trim: true,


    },


    deviseParDefaut: {


      type: String,


      required: true,


      trim: true,


      default: "USD ($)",


    },


    tailleBusiness: {


      type: String,


      trim: true,


    },


    plan: { type: String, enum: ["Free", "Moyenne", "Premium"], default: "Free" },


    statutPaiement: { type: String, enum: ["A jour", "En retard", "Essai"], default: "Essai" },


    trialExpiresAt: {


      type: Date,


      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),


    },


    isDeleted: { type: Boolean, default: false },


  },


  { timestamps: true }


);





const Permission = mongoose.model("Permission", permissionSchema);


const Role = mongoose.model("Role", roleSchema);


const RolePermission = mongoose.model("RolePermission", rolePermissionSchema);


const Departement = mongoose.model("Departement", departementSchema);

const Categorie = mongoose.model("Categorie", categorieSchema);

const Produit = mongoose.model("Produit", produitSchema);

const MouvementStock = mongoose.model("MouvementStock", mouvementStockSchema);

const Vente = mongoose.model("Vente", venteSchema);


const RetourClient = mongoose.model("RetourClient", retourClientSchema);

const InventaireAudit = mongoose.model("InventaireAudit", inventaireAuditSchema);

const Utilisateur = mongoose.model("Utilisateur", utilisateurSchema);

const Boutique = mongoose.model("Boutique", boutiqueSchema);





export { Permission, Role, RolePermission, Departement, Categorie, Produit, MouvementStock, Vente, RetourClient, InventaireAudit, Utilisateur, Boutique };


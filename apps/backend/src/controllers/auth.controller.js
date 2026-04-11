import bcrypt from "bcryptjs";
import crypto from "crypto"; 
import Utilisateur from "../models/Utilisateur.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * LOGIQUE D'INSCRIPTION (Register)
 * Version Professionnelle : Validation + Hachage + Lien de confirmation par Email
 */
export const register = async (req, res) => {
  try {
    const { 
      prenom, nom, postnom, email, telephone, 
      nomBoutique, secteurActivite, deviseParDefaut, 
      tailleBusiness, password, confirmPassword 
    } = req.body;

    // --- 1. VALIDATIONS DE SÉCURITÉ (REGEX) ---
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Password : 8 car, 1 Maj, 1 Min, 1 Chiffre, 1 Spécial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!nameRegex.test(prenom) || !nameRegex.test(nom)) {
      return res.status(400).json({ message: "Le prénom et le nom doivent contenir uniquement des lettres." });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Format d'email invalide." });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: "Mot de passe trop faible : 8 caractères minimum, une majuscule, un chiffre et un caractère spécial." 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }

    // --- 2. VALIDATION DES OPTIONS (LISTE BLANCHE) ---
    const secteursValides = ["Commerce Général", "Supermarché", "Pharmacie", "Restaurant", "Fast-food", "Bar", "Café", "Boutique de vêtements", "Salon de coiffure", "Quincaillerie", "Autre"];
    if (!secteursValides.includes(secteurActivite)) {
      return res.status(400).json({ message: "Secteur d'activité invalide." });
    }

    const devisesValides = ["USD ($)", "CDF (FC)", "EUR (€)"];
    if (!devisesValides.includes(deviseParDefaut)) {
      return res.status(400).json({ message: "Devise non supportée." });
    }

    // --- 3. VÉRIFICATION DOUBLON EMAIL ---
    const userExists = await Utilisateur.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "Cet email est déjà associé à un compte." });
    }

    // --- 4. PRÉPARATION DES DONNÉES DE SÉCURITÉ ---
    // Hachage du mot de passe
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Génération du Token de confirmation (Lien magique)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Valide 24 heures

    // --- 5. INSERTION EN BASE DE DONNÉES ---
    const nouvelUtilisateur = new Utilisateur({
      prenom,
      nom,
      email: email.toLowerCase(),
      telephone,
      nomBoutique,
      secteurActivite,
      deviseParDefaut,
      tailleBusiness,
      password: hashedPassword,
      activationToken: verificationToken,
      activationTokenExpires: tokenExpires
    });

    await nouvelUtilisateur.save();

    // --- 6. CONSTRUCTION ET ENVOI DE L'EMAIL ---
    const activationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">StockMaster Pro</h1>
          <p style="color: #6b7280; font-size: 16px;">La gestion intelligente de votre business</p>
        </div>
        <h2 style="font-size: 20px; font-weight: 600;">Bonjour ${prenom},</h2>
        <p style="line-height: 1.6;">Merci de nous avoir rejoints ! Pour activer votre compte et commencer à gérer <strong>${nomBoutique}</strong>, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${activationLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirmer mon compte</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">Ce lien est valide pendant <strong>24 heures</strong>. Si le bouton ne fonctionne pas, copiez ce lien :<br>
        <span style="color: #2563eb;">${activationLink}</span></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} StockMaster Pro. Tous droits réservés.</p>
      </div>
    `;

    await sendEmail({
      email: email.toLowerCase(),
      subject: "Bienvenue ! Confirmez votre compte StockMaster Pro",
      html: emailHtml
    });

    res.status(201).json({ 
      success: true, 
      message: "Inscription réussie ! Un lien de confirmation a été envoyé sur votre email." 
    });

  } catch (error) {
    console.error("ERREUR REGISTER:", error);
    res.status(500).json({ message: "Une erreur est survenue lors de l'inscription." });
  }
};

/**
 * LOGIQUE DE CONNEXION (Login)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Utilisateur.findOne({ email: email.toLowerCase() }).select("+password +loginAttempts +lockUntil");

    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Veuillez confirmer votre compte via l'email envoyé avant de vous connecter." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    res.status(200).json({
      success: true,
      message: "Connexion réussie !",
      user: { id: user._id, nom: user.nom, prenom: user.prenom, email: user.email }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur lors de la connexion" });
  }
};

/**
 * VÉRIFICATION DU LIEN (Email Confirmation)
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await Utilisateur.findOne({
      activationToken: token,
      activationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Le lien est invalide ou a expiré." });
    }

    user.isActive = true;
    user.emailVerifiedAt = Date.now();
    user.activationToken = undefined;
    user.activationTokenExpires = undefined;

    await user.save();

    res.status(200).json({ success: true, message: "Compte activé ! Vous pouvez vous connecter." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la validation." });
  }
};
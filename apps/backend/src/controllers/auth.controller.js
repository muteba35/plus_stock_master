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

    // --- 1. VALIDATIONS DE SÉCURITÉ ---
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Password : 8 car, 1 Maj, 1 Min, 1 Chiffre, 1 Spécial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!nameRegex.test(prenom) || !nameRegex.test(nom)) {
      return res.status(400).json({ message: "Le prénom et le nom doivent contenir au moins 2 lettres." });
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

    // --- 2. VÉRIFICATION DOUBLON EMAIL ---
    const userExists = await Utilisateur.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: "Cet email est déjà associé à un compte." });
    }

    // --- 3. PRÉPARATION DES DONNÉES ---
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 heures

    // --- 4. INSERTION EN BASE DE DONNÉES ---
    const nouvelUtilisateur = new Utilisateur({
      prenom,
      nom,
      postnom: postnom || "", // Évite le undefined si non fourni
      email: email.toLowerCase().trim(),
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

    // --- 5. ENVOI DE L'EMAIL (Non bloquant) ---
    const activationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">StockMaster Pro</h1>
          <p style="color: #6b7280; font-size: 16px;">La gestion intelligente de votre business</p>
        </div>
        <h2 style="font-size: 20px; font-weight: 600;">Bonjour ${prenom},</h2>
        <p style="line-height: 1.6;">Merci de nous avoir rejoints ! Pour activer votre compte et commencer à gérer <strong>${nomBoutique}</strong>, veuillez confirmer votre adresse email :</p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${activationLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirmer mon compte</a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">Lien valide pendant 24h.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">© ${new Date().getFullYear()} StockMaster Pro.</p>
      </div>
    `;

    // Utilisation d'un try/catch interne pour que l'échec du mail ne renvoie pas une erreur 500
    try {
      await sendEmail({
        email: email.toLowerCase().trim(),
        subject: "Activez votre compte StockMaster Pro",
        html: emailHtml
      });
    } catch (mailError) {
      console.error("Erreur SMTP : L'email n'a pas pu être envoyé :", mailError.message);
      // L'utilisateur est quand même créé, on peut continuer
    }

    // --- 6. RÉPONSE FINALE ---
    return res.status(201).json({
      success: true,
      message: "Inscription réussie ! Un lien de confirmation a été envoyé à votre adresse email."
    });

  } catch (error) {
    console.error("ERREUR CRITIQUE REGISTER:", error);
    return res.status(500).json({
      message: "Une erreur est survenue lors de la création du compte.",
      error: error.message
    });
  }
};

/**
 * LOGIQUE DE CONNEXION (Login)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Veuillez activer votre compte via l'email envoyé." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    // Réponse sans le mot de passe
    return res.status(200).json({
      success: true,
      message: "Connexion réussie !",
      user: { id: user._id, prenom: user.prenom, nom: user.nom, email: user.email }
    });

  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur lors de la connexion." });
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

    return res.status(200).json({ success: true, message: "Compte activé avec succès !" });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la validation du compte." });
  }
};
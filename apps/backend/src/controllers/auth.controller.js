import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Utilisateur, Boutique } from "../models/Utilisateur.js";
import { sendEmail, sendSecurityAlertEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';

/**
 * LOGIQUE D'INSCRIPTION (Register)
 * Version sécurisée : Validation stricte 9 chiffres (RDC) + Doublons multiples
 */
export const register = async (req, res) => {
  // Utilisation d'une session pour garantir que si la boutique échoue, l'utilisateur n'est pas créé (Atomicité)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      prenom, nom, postnom, email, telephone,
      nomBoutique, secteurActivite, deviseParDefaut,
      tailleBusiness, password, confirmPassword
    } = req.body;

    // --- 1. VALIDATIONS ---
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const phoneRegex = /^[0-9]{9}$/; 
    const boutiqueRegex = /^[A-Za-z0-9À-ÖØ-öø-ÿ\s'-]{3,}$/;

    if (!nameRegex.test(prenom) || !nameRegex.test(nom)) {
      return res.status(400).json({ status: "error", message: "Prénom/Nom invalide (min 2 lettres)." });
    }
    if (!phoneRegex.test(telephone)) {
      return res.status(400).json({ status: "error", message: "Le numéro doit contenir 9 chiffres." });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: "error", message: "Format d'email invalide." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ status: "error", message: "Les mots de passe ne correspondent pas." });
    }

    // --- 2. VÉRIFICATION DOUBLONS ---
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = telephone.trim();
    const cleanBoutique = nomBoutique.trim();

    // On vérifie l'utilisateur (Email/Tel)
    const userExists = await Utilisateur.findOne({ $or: [{ email: cleanEmail }, { telephone: cleanPhone }] });
    if (userExists) {
      return res.status(400).json({ status: "error", message: "Email ou téléphone déjà utilisé." });
    }

    // On vérifie si la boutique existe déjà
    const boutiqueExists = await Boutique.findOne({ nom: cleanBoutique });
    if (boutiqueExists) {
      return res.status(400).json({ status: "error", message: "Ce nom de boutique est déjà pris." });
    }

    // --- 3. SÉCURITÉ ---
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    // --- 4. CRÉATION DE L'UTILISATEUR (PROPRIÉTAIRE) ---
    const nouvelUtilisateur = new Utilisateur({
      prenom,
      nom,
      postnom: postnom || "",
      email: cleanEmail,
      telephone: cleanPhone,
      password: hashedPassword,
      role: "proprietaire", // Défini par défaut dans le schéma mais on explicite
      activationToken: verificationToken,
      activationTokenExpires: tokenExpires
    });

    const userSaved = await nouvelUtilisateur.save();

    // --- 5. CRÉATION DE LA BOUTIQUE LIÉE ---
    const nouvelleBoutique = new Boutique({
      nom: cleanBoutique,
      proprietaireId: userSaved._id, // Lien vers l'utilisateur qu'on vient de créer
      secteurActivite,
      deviseParDefaut,
      tailleBusiness
    });

    const boutiqueSaved = await nouvelleBoutique.save();

    // On met à jour l'utilisateur pour lui assigner sa boutiqueActive
    userSaved.boutiqueActive = boutiqueSaved._id;
    await userSaved.save();

     /*Si tout est ok, on valide la transaction*/
    // /*await session.commitTransaction();*/
    // /*session.endSession();*/

    // --- 6. ENVOI DE L'EMAIL ---
    const activationLink = `${process.env.BACKEND_URL}/api/auth/verify-email/${verificationToken}`;
    const emailHtml = `
  <div style="background-color: #f1f5f9; padding: 20px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <tr>
        <td style="background-color: #090e1a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
            STOCK<span style="color: #6366f1;">MASTER</span>
          </h1>
          <p style="color: #94a3b8; font-size: 10px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">Édition Professionnelle</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 40px 30px;">
          <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 20px 0; font-weight: 700;">Bienvenue, ${prenom} !</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 30px 0;">
            Votre espace de gestion pour <strong style="color: #0f172a;">${nomBoutique}</strong> est prêt. 
            Pour sécuriser vos accès et valider votre compte professionnel, merci de cliquer sur le bouton ci-dessous :
          </p>

          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#6366f1" style="border-radius: 8px;">
                <a href="${activationLink}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 18px 35px; display: inline-block; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Vérifier mon identité
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #94a3b8; margin: 30px 0 0 0; text-align: center;">
            Ce lien est valable 24h. Si vous n'avez pas créé de compte, ignorez ce message.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
            &copy; ${new Date().getFullYear()} <strong>StockMaster Pro</strong><br>
            Sécurité certifiée et données cryptées
          </p>
        </td>
      </tr>
    </table>
  </div>
`;
    try {
      await sendEmail({
        email: cleanEmail,
        subject: "Activez votre compte StockMaster Pro",
        html: emailHtml
      });
    } catch (mailError) {
      console.error("Erreur SMTP :", mailError.message);
      // On ne bloque pas la réponse si l'email échoue, l'utilisateur est déjà en base
    }

    return res.status(201).json({ 
      success: true, 
      message: "Compte et Boutique créés ! Vérifiez vos emails pour l'activer." 
    });

  } catch (error) {
    // En cas d'erreur, on annule tout ce qui a été fait dans la session
    await session.abortTransaction();
    session.endSession();
    console.error("Erreur Register:", error);
    return res.status(500).json({ status: "error", message: "Erreur technique lors de l'enregistrement." });
  }
};

/**
 * LOGIQUE DE CONNEXION (Login)
 */
export const login = async (req, res) => {
  try {
      // 1. Extraction des données envoyées par le client (Frontend) depuis le corps de la requête
    const { email, password } = req.body;

    // 2. Recherche de l'utilisateur en base de données par son email.
    // Le .select() est CRUCIAL ici : on force la récupération des champs marqués "select: false" 
    // dans le schéma (mot de passe, OTP, tentatives) pour pouvoir effectuer les vérifications de sécurité.
    // On "populate" aussi la boutiqueActive pour charger les infos de la boutique dès la connexion (gain de performance pour le frontend).  
    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() })
      .select("+password +otpCode +otpExpires +loginAttempts +lockUntil +isPermanentlyBlocked")
      .populate("boutiqueActive");


    // 1. Vérifier si l'utilisateur existe
    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    // AJOUT : Vérifier si le mail est activé avant de lancer la procédure OTP
    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Veuillez activer votre compte via l'email reçu lors de l'inscription." 
      });
    }

    // 2. Vérifier les blocages de sécurité
    if (user.isPermanentlyBlocked) {
      return res.status(403).json({ message: "Compte bloqué. Contactez le support" });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesRestantes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ 
        message: `Compte bloqué temporairement. Réessayez dans ${minutesRestantes} min.` 
      });
    }

    // 3. Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;
      let responseMessage = "Identifiants incorrects";
      let status = 401;

      // Gestion des paliers de tentatives (Ta logique UX)
      if (user.loginAttempts >= 7) {
        user.isPermanentlyBlocked = true;
        responseMessage = "Compte bloqué. Contactez le support";
        status = 403;
        // Email de notification de bannissement
        await sendSecurityAlertEmail(user.email, "banned");

      } else if (user.loginAttempts === 6) {
        user.lockUntil = Date.now() + 60 * 60 * 1000; // Bloqué 1h
        responseMessage = "Compte bloqué temporairement (1h)";
        status = 403;
        // Email d'alerte critique avec recommandation de changement de mot de passe
        await sendSecurityAlertEmail(user.email, "critical");

      } else if (user.loginAttempts >= 4) {
        const reste = 6 - user.loginAttempts;
        responseMessage = `Attention, encore ${reste} tentative(s) avant blocage`;
         
        // Email d'avertissement léger (préventif)
        await sendSecurityAlertEmail(user.email, "warning", reste);
      }

      await user.save();
      return res.status(status).json({ message: responseMessage });
    }

    // 4. SI TOUT EST OK -> GÉNÉRER OTP (Pas de JWT encore)
    // On remet les tentatives à 0 car le password est bon
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Code à 6 chiffres
    user.otpCode = otp;
    user.otpExpires = Date.now() + 45 * 1000; // Valable 45 secondes
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

   /**
 * Génère le template HTML professionnel pour l'envoi de l'OTP
 */
const renderOtpEmail = (prenom, otp) => {
  // Formatage pour l'affichage (ex: 123 456)
  const formattedOtp = otp.split('').map((char, i) => i === 2 ? char + ' ' : char).join('');

  return `
  <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <tr>
        <td style="background-color: #090e1a; padding: 45px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
            STOCK<span style="color: #6366f1;">MASTER</span>
          </h1>
          <p style="color: #94a3b8; font-size: 10px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">Édition Professionnelle</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 50px 40px; text-align: center;">
          <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 20px 0; font-weight: 700;">Code de vérification</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 30px 0;">
            Bonjour <strong style="color: #0f172a;">${prenom}</strong>,<br>
            Utilisez le code de sécurité ci-dessous pour finaliser votre connexion à votre interface <strong>StockMaster</strong> :
          </p>

          <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px; padding: 30px; margin: 0 auto; max-width: 300px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; color: #6366f1; letter-spacing: 10px; display: block;">
              ${formattedOtp}
            </span>
          </div>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.5;">
              <strong style="color: #ef4444;">Note de sécurité :</strong> Ce code expirera dans 45 secondes.<br>
              Si vous n'êtes pas à l'origine de cette connexion, ignorez simplement cet email.
            </p>
          </div>
        </td>
      </tr>

      <tr>
        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; font-weight: 500;">
            &copy; ${new Date().getFullYear()} <strong>StockMaster Pro</strong><br>
            RDC • Système de gestion sécurisé
          </p>
        </td>
      </tr>
    </table>
  </div>
`;
};


    try {
      // 5. ENVOYER L'OTP PAR EMAIL
      await sendEmail({
        email: user.email,
        subject: `Votre code StockMaster : ${otp}`,
        html: renderOtpEmail(user.prenom, otp) 
      });
    } catch (mailError) {
      console.error("Erreur SMTP :", mailError.message);
      // On peut choisir d'envoyer quand même la réponse 200 si on veut que l'user 
      // soit redirigé, mais l'informer d'un possible retard.
    }

    res.status(200).json({ 
      success: true, 
      message: "Code de vérification envoyé",
      email: user.email,
      hasBoutique: !!user.boutiqueActive 
    });


  } catch (error) {
    console.error("Erreur serveur détaillée :", error);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

/**
 * Vérification de l'email et activation du compte
 * Route: POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res) => {
  try {
    // On récupère le token depuis l'URL (ex: /verify-email/ABC123)
    // ON CHERCHE PARTOUT : Dans l'URL (:token) OU après le ? (?token=)
    const token = req.params.token || req.query.token;

    console.log("TOKEN REÇU :", token);

    if (!token) {
      console.log("Aucun token fourni");
      return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=invalid`);
    }

    // 1. Chercher l’utilisateur
    const user = await Utilisateur.findOne({ activationToken: token });

    if (!user) {
      console.log("Utilisateur non trouvé dans la BDD pour ce token");
      return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=invalid`);
    }
    // 2. Vérifier expiration
    if (user.activationTokenExpires < Date.now()) {
      console.log("Token expiré");
      return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=expired`);
    }

    // 3. Déjà activé ?
    if (user.isActive) {
      return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=already`);
    }

    // 4. Activation
    user.isActive = true;
    user.emailVerifiedAt = new Date();
    user.activationToken = undefined;
    user.activationTokenExpires = undefined;

    await user.save();

    console.log("COMPTE ACTIVÉ POUR :", user.email);

    // 5. Redirection vers le frontend avec succès
    return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=success`);

  } catch (error) {
    console.error("VERIFY EMAIL ERROR :", error);
    return res.redirect(`${process.env.FRONTEND_URL}/verify-email?status=error`);
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Utilisateur.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Ce compte est déjà activé." });
    }

    // 1. Génération du token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    
    user.activationToken = verificationToken;
    user.activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    await user.save();

    // 2. Préparation du lien (On utilise activationLink partout)
    const activationLink = `${process.env.BACKEND_URL}/api/auth/verify-email/${verificationToken}`;
    const emailHtml = `
  <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <tr>
        <td style="background-color: #090e1a; padding: 45px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
            STOCK<span style="color: #6366f1;">MASTER</span>
          </h1>
          <p style="color: #94a3b8; font-size: 10px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">Édition Professionnelle</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 50px 40px;">
          <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 20px 0; font-weight: 700;">Nouveau lien de vérification</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 30px 0;">
            Bonjour <strong style="color: #0f172a;">${user.prenom}</strong>,<br><br>
            Vous avez demandé un nouveau lien pour activer votre accès à l'espace <strong style="color: #0f172a;">${user.nomBoutique}</strong>. 
            Cliquez sur le bouton ci-dessous pour finaliser la configuration de votre compte pro :
          </p>

          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#6366f1" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                <a href="${activationLink}" target="_blank" style="font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 20px 40px; display: inline-block; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px;">
                  Activer mon compte
                </a>
              </td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.5;">
              <strong>Note de sécurité :</strong> Ce lien expirera dans 24 heures.<br>
              Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
        </td>
      </tr>

      <tr>
        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; font-weight: 500;">
            &copy; ${new Date().getFullYear()} <strong>StockMaster Pro</strong><br>
            Système de gestion de stock intelligent sécurisé
          </p>
        </td>
      </tr>
    </table>
  </div>
`;
      
 // 3. Envoi du mail (On utilise l'email extrait du body ou celui du user)
    try {
      await sendEmail({
        email: user.email, // Changé cleanEmail par user.email
        subject: "Nouveau lien de vérification - StockMaster Pro",
        html: emailHtml
      });
    } catch (mailError) {
      console.error("Erreur SMTP :", mailError.message);
      // On ne bloque pas forcément ici, mais on log l'erreur
    }

    res.status(200).json({ 
      success: true, 
      message: "Nouveau lien envoyé avec succès !" 
    });

  } catch (error) {
    console.error("Erreur serveur détaillée :", error);
    res.status(500).json({ message: "Erreur serveur lors du renvoi." });
  }
};


export const verifyOTP = async (req, res) => {
  try {
      
      // 1. Extraction des données envoyées par le client (Frontend) depuis le corps de la requête
       const { email, otp } = req.body;

      // 1. Trouver l'utilisateur
      // 1. Récupération de l'utilisateur avec ses données de sécurité temporaires (OTP).
      // On ne demande pas le "+password" ici car il a déjà été vérifié à l'étape précédente,
      // mais on "débloque" l'accès au code OTP et à sa date d'expiration pour les comparer.
    const user = await Utilisateur.findOne({ email }).select("+otpCode +otpExpires +loginAttempts");

      // 2. Vérification de l'existence de l'utilisateur.
      // Si l'email n'existe pas (ou a été supprimé entre-temps), on stoppe le processus.
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }


    // 2. Vérifier si le code est expiré
    if (!user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Le code a expiré. Demandez-en un nouveau." });
    }


    // 3. Vérifier si le code est correct
    if (user.otpCode !== otp) {
      return res.status(400).json({ message: "Code de vérification incorrect" });
    }

    // 4. SI TOUT EST OK : On valide la connexion
    // On nettoie les champs OTP et les tentatives de sécurité
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.loginAttempts = 0; 
    user.isPermanentlyBlocked = false; // Au cas où un admin l'aurait débloqué entre temps
    await user.save();

    // 5. Générer le Token JWT définitif
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, // "proprietaire" ou "employe"
        boutiqueId: user.boutiqueActive?._id 
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    // 6. Réponse complète pour le Frontend
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        role: user.role,
        boutique: user.boutiqueActive // Envoie l'objet boutique complet (nom, devise, etc.)
      },
      message: "Connexion réussie ! Bienvenue sur StockMaster."
    });

  } catch (error) {
    console.error("Erreur verifyOTP:", error);
    res.status(500).json({ message: "Erreur lors de la vérification du code" });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. On récupère l'utilisateur avec ses infos de sécurité
    const user = await Utilisateur.findOne({ email }).select("+prenom +otpExpires");
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

   // 2. SYSTÈME ANTI-SPAM CORRIGÉ : 
    // On autorise le renvoi sans condition de temps ici, car c'est le FRONTEND 
    // qui gère déjà le délai de 45s avec le bouton grisé.
    // On garde juste une petite sécurité de 5s au cas où quelqu'un bypass le front.
    if (user.otpExpires && (user.otpExpires - Date.now() > 40000)) { // 40 secondes restantes
       return res.status(429).json({ 
         message: `Veuillez patienter quelques secondes avant de redemander.` 
       });
    }

    // 3. Générer le nouveau code
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Mettre à jour l'utilisateur (Validité 45 secondes)
    user.otpCode = newOtp;
    user.otpExpires = Date.now() + 45 * 1000; 
    await user.save();

    // On prépare le code formaté (ex: 123 456) pour une lecture facile
const formattedOtp = newOtp.split('').map((char, i) => i === 2 ? char + ' ' : char).join('');

const emailOtp = `
  <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <tr>
        <td style="background-color: #090e1a; padding: 45px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
            STOCK<span style="color: #6366f1;">MASTER</span>
          </h1>
          <p style="color: #94a3b8; font-size: 10px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">Édition Professionnelle</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 50px 40px; text-align: center;">
          <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 15px 0; font-weight: 700;">Code de sécurité</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 35px 0;">
            Bonjour <strong style="color: #0f172a;">${user.prenom}</strong>,<br>
            Voici votre nouveau code de vérification pour accéder à votre instance.
          </p>

          <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px; padding: 30px; margin: 0 auto; max-width: 300px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #6366f1; display: block;">
              ${newOtp}
            </span>
          </div>

          <p style="margin-top: 35px; font-size: 13px; color: #64748b;">
            Ce code est strictement confidentiel et expirera dans <strong style="color: #ef4444;">45 secondes</strong>.
          </p>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
              <strong>Note de sécurité :</strong> Si vous n'êtes pas à l'origine de cette demande, 
              veuillez ignorer cet email. Votre compte reste sécurisé.
            </p>
          </div>
        </td>
      </tr>

      <tr>
        <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; font-weight: 500;">
            &copy; ${new Date().getFullYear()} <strong>StockMaster Pro</strong><br>
            Infrastructure de Gestion Sécurisée
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

try {
  await sendEmail({
    email: user.email,
    subject: `[ACTION REQUISE] Votre code StockMaster : ${newOtp}`,
    html: emailOtp
  });

  res.status(200).json({ 
    success: true, 
    message: "Nouveau code envoyé ! Vérifiez vos emails." 
  });

} catch (mailError) {
  console.error("Erreur SMTP :", mailError.message);
  res.status(500).json({ message: "Le serveur mail est surchargé. Réessayez." });
}

  } catch (error) {
    console.error("Erreur resendOTP:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi du nouveau code" });
  }
};

// fonction pour le mot de passe oublié
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Pour la sécurité, on ne dit pas si l'email existe ou pas
      return res.status(200).json({ status: "success", message: "Si ce compte existe, un email a été envoyé." });
    }

    // Génération du token de récupération
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // On stocke le token directement sur l'utilisateur (on peut aussi hasher le token pour plus de sécurité)
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex"); // On peut réutiliser ce champ ou en créer un dédié (ex: resetPasswordToken)
    user.resetPasswordExpires = Date.now() + 3600000; // Valable 1 heure

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const emailHtml = `
      <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #090e1a; padding: 45px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                STOCK<span style="color: #6366f1;">MASTER</span>
              </h1>
              <p style="color: #94a3b8; font-size: 10px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 3px; font-weight: bold;">Édition Professionnelle</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 50px 40px; text-align: center;">
              <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 15px 0; font-weight: 700;">Réinitialisation de mot de passe</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 35px 0;">
                Bonjour <strong style="color: #0f172a;">${user.prenom}</strong>,<br>
                Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte StockMaster. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
              </p>

              <!-- Button -->
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #6366f1; color: #ffffff; padding: 18px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                  Réinitialiser mon mot de passe
                </a>
              </div>

              <p style="margin-top: 35px; font-size: 13px; color: #64748b;">
                Ce lien est valable pendant <strong style="color: #0f172a;">60 minutes</strong>. Passé ce délai, vous devrez effectuer une nouvelle demande.
              </p>

              <!-- Security Note -->
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  <strong>Note de sécurité :</strong> Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5; font-weight: 500;">
                &copy; ${new Date().getFullYear()} <strong>StockMaster Pro</strong><br>
                Infrastructure de Gestion Sécurisée
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;


    // Envoi de l'email (Le template reste similaire aux précédents)
     await sendEmail({
      email: user.email,
      subject: "Réinitialisation de votre mot de passe - StockMaster",
      html: emailHtml
    });

    res.status(200).json({ status: "success", message: "Email de récupération envoyé." });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ status: "error", message: "Erreur technique." });
  }
};


// fonction pour réinitialiser le mot de passe

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params; 
    const { password, confirmPassword } = req.body;

    // ==========================================
    // PHASE 1 : VALIDATION DE LA COHÉRENCE & SÉCURITÉ
    // ==========================================
    
    // 1. Vérification de correspondance
    if (password !== confirmPassword) {
      return res.status(400).json({ status: "error", message: "Les mots de passe ne correspondent pas." });
    }

    // 2. Validation de la force du mot de passe (Même règle que l'inscription)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        status: "error", 
        message: "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial." 
      });
    }

    // ==========================================
    // PHASE 2 : LE "RESET" (Validation du jeton)
    // ==========================================
    
    // 1. Hachage du token reçu pour comparaison avec la BDD
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Recherche de l'utilisateur avec token valide et non expiré
    // Note : on utilise .select("+resetPasswordToken +resetPasswordExpires") 
    // si tu as mis select: false dans ton schéma.
    const user = await Utilisateur.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ status: "error", message: "Lien de réinitialisation invalide ou expiré." });
    }

    // ==========================================
    // PHASE 3 : MISE À JOUR SÉCURISÉE
    // ==========================================

    // 1. Hachage Bcrypt du nouveau mot de passe
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    // 2. Nettoyage (Usage unique du token)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // 3. Sauvegarde dans MongoDB
    await user.save();

    res.status(200).json({ 
      status: "success", 
      message: "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez vous connecter." 
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ status: "error", message: "Erreur technique lors de la réinitialisation." });
  }
};

// ==========================================
// FONCTION : REDEMANDER / RENVOYER LE LIEN
// ==========================================
export const resendForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. On cherche l'utilisateur
    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() });

    // Sécurité : On renvoie la même réponse même si l'user n'existe pas
    if (!user) {
      return res.status(200).json({ 
        status: "success", 
        message: "Si ce compte existe, un nouveau lien a été envoyé." 
      });
    }

  
    // 3. Génération d'un NOUVEAU token (écrasera l'ancien en BDD)
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // 4. Hachage et mise à jour des champs de réinitialisation
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Nouvelle validité de 1 heure

    await user.save();

    // 5. Construction du nouveau lien
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 6. Envoi de l'email (Réutilisation de ton template emailHtml)
    await sendEmail({
  email: user.email,
  subject: "Nouveau lien de réinitialisation - StockMaster",
  html: `
    <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        
        <tr>
          <td style="background-color: #090e1a; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
              STOCK<span style="color: #6366f1;">MASTER</span>
            </h1>
            <p style="color: #94a3b8; font-size: 9px; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Security Infrastructure</p>
          </td>
        </tr>

        <tr>
          <td style="padding: 40px; text-align: center;">
            <div style="display: inline-block; padding: 8px 16px; background-color: #eef2ff; color: #6366f1; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px;">
              Nouvelle Demande
            </div>
            <h2 style="font-size: 20px; color: #0f172a; margin: 0 0 15px 0; font-weight: 700;">Votre nouveau lien est prêt</h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 30px 0;">
              Bonjour <strong>${user.prenom}</strong>,<br>
              À votre demande, nous avons généré un nouveau lien de sécurisation. 
              <br><i style="font-size: 12px; color: #ef4444;">Note : Ce lien annule et remplace automatiquement le précédent.</i>
            </p>

            <div style="margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #6366f1; color: #ffffff; padding: 18px 32px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                Réinitialiser mon mot de passe
              </a>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">
              Lien sécurisé valable pendant 60 minutes.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 10px; color: #94a3b8; margin: 0;">
              &copy; ${new Date().getFullYear()} StockMaster Pro Edition. Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `
});

    res.status(200).json({ 
      status: "success", 
      message: "Un nouveau lien a été envoyé à votre adresse email." 
    });

  } catch (error) {
    console.error("RESEND ERROR:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Erreur lors du renvoi du lien." 
    });
  }
};

// pour récupérer les informations de l'utilisateur connecté
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id; 

    const user = await Utilisateur.findById(userId).select('-password'); 
    
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }

    let sesPermissions = [];

    if (user.role === 'proprietaire') {
      const toutesLesPermissions = await Permission.find({});
      sesPermissions = toutesLesPermissions.map(p => p.nom); 
    } else {
      // AJOUT de ta nouvelle permission ici pour l'employé
      sesPermissions = [
        "VOIR_ALERTES_STOCK",
        "EFFECTUER_VENTE",
        "IMPRIMER_FACTURE",
        "MODIFIER_PROFIL_RESTREINT"
      ]; 
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        boutiqueActive: user.boutiqueActive
      },
      permissions: sesPermissions
    });

  } catch (error) {
    console.error("Erreur dans getMe :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur interne." });
  }
};


// ==========================================
// CONFIGURATIONS DE SÉCURITÉ & UTILS (Inchangé)
// ==========================================
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const validatePasswordRequirements = (password) => {
  if (password.length < 8) return "Le mot de passe doit faire au moins 8 caractères.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Le mot de passe doit contenir au moins un caractère spécial (@, #, $, ...).";
  return null;
};

const formatProfileResponse = (user) => {
  return {
    firstName: user.prenom || "",
    lastName: user.nom || "",
    email: user.email || "",
    phone: user.telephone || "",
    role: user.role === "proprietaire" ? "Propriétaire / Développeur" : user.role,
    bio: "Gestionnaire principal de la plateforme commerciale.",
    country: user.boutiqueActive ? "République Démocratique du Congo" : "Non spécifié",
    city: user.city || "",
    postalCode: user.postalCode || "N/A",
    taxId: user.taxId || "",
    avatar: user.avatar || ""
  };
};


// Récupérer les informations du profil connecté (Inchangé)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }
    
    const user = await Utilisateur.findById(userId).populate('boutiqueActive');

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    return res.status(200).json(formatProfileResponse(user));

  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};


// 2. Mettre à jour les informations du profil connecté (SÉCURISÉ PAR RÔLE)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }

    // 1. On récupère d'abord l'utilisateur en BDD pour vérifier son rôle réel
    const userCheck = await Utilisateur.findById(userId);
    if (!userCheck) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    const { prenom, nom, firstName, lastName, email, telephone, phone, city, taxId, postalCode, avatar } = req.body;

    // --- VALIDATION SÉCURISÉE DE L'AVATAR ---
    if (avatar) {
      if (avatar.startsWith('data:')) {
        const mimeType = avatar.split(';')[0].split(':')[1];
        if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
          return res.status(400).json({ 
            error: "Format de fichier non valide. Seules les images (JPEG, PNG, WEBP, GIF) sont autorisées." 
          });
        }
      } else {
        const extensionMatch = avatar.match(/\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i);
        if (!extensionMatch) {
          return res.status(400).json({ 
            error: "Le lien fourni ne pointe pas vers un format d'image valide." 
          });
        }
      }
    }

    // --- FILTRAGE DES DONNÉES SELON LES PERMISSIONS ---
    let donneesMiseAJour = {};

    // Si l'utilisateur n'est PAS propriétaire, il subit la restriction de l'employé
    if (userCheck.role !== 'proprietaire') {
      // Sécurité maximale : Même si le front ou un hacker envoie le reste, le backend ignore TOUT sauf téléphone et avatar.
      donneesMiseAJour = {
        telephone: telephone || phone,
        avatar
      };
    } else {
      // 🔓 Le propriétaire a le droit de tout mettre à jour
      donneesMiseAJour = {
        prenom: prenom || firstName,
        nom: nom || lastName,
        email,
        telephone: telephone || phone,
        city,
        taxId,
        postalCode,
        avatar 
      };
    }

    // --- APPLICATION DE LA MISE À JOUR ---
    const updatedUser = await Utilisateur.findByIdAndUpdate(
      userId,
      { $set: donneesMiseAJour }, // On injecte uniquement l'objet filtré
      { new: true, runValidators: true }
    ).populate('boutiqueActive');

    // On renvoie le profil formaté
    res.status(200).json(formatProfileResponse(updatedUser));
  } catch (error) {
    console.error("Erreur updateProfile:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil." });
  }
};

// 3. Changer le mot de passe avec validation stricte
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Le mot de passe actuel et le nouveau mot de passe sont requis." });
    }

    // 1. Récupérer l'utilisateur avec son mot de passe actuel
    const user = await Utilisateur.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }

    // 2. Vérifier si l'ancien mot de passe est correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "L'ancien mot de passe est incorrect." });
    }

    // 3. Application des règles de validation de sécurité strictes
    const passwordValidationError = validatePasswordRequirements(newPassword);
    if (passwordValidationError) {
      return res.status(400).json({ error: passwordValidationError });
    }

    // Éviter de réutiliser le même mot de passe
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit être différent de l'actuel." });
    }

    // 4. Hasher le nouveau mot de passe et sauvegarder
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (error) {
    console.error("Erreur updatePassword:", error);
    res.status(500).json({ error: "Erreur serveur lors du changement de mot de passe." });
  }
};
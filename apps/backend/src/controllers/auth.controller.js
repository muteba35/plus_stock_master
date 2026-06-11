import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Utilisateur, Boutique } from "../models/Utilisateur.js"; 
import { sendEmail, sendSecurityAlertEmail } from "../utils/sendEmail.js";
import { Permission, RolePermission } from "../models/Utilisateur.js";

export const register = async (req, res) => {
  try {
    const {
      prenom, nom, postnom, email, telephone,
      nomBoutique, secteurActivite, deviseParDefaut,
      tailleBusiness, password, confirmPassword
    } = req.body;

    // --- 1. VALIDATIONS ---
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]{2,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{9}$/; 

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

    // --- 2. VÉRIFICATION DES DOUBLONS ---
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = telephone.trim();
    const cleanBoutique = nomBoutique.trim();

    const userExists = await Utilisateur.findOne({ $or: [{ email: cleanEmail }, { telephone: cleanPhone }] });
    if (userExists) {
      return res.status(400).json({ status: "error", message: "Email ou téléphone déjà utilisé." });
    }

    const boutiqueExists = await Boutique.findOne({ nom: cleanBoutique });
    if (boutiqueExists) {
      return res.status(400).json({ status: "error", message: "Ce nom de boutique est déjà pris." });
    }

    // --- 3. SÉCURITÉ ---
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    // --- 4. CRÉATION DE L'UTILISATEUR ---
    const nouvelUtilisateur = new Utilisateur({
      prenom,
      nom,
      postnom: postnom || "",
      email: cleanEmail,
      telephone: cleanPhone,
      password: hashedPassword,
      roleId: null, 
      activationToken: verificationToken,
      activationTokenExpires: tokenExpires
    });

    const userSaved = await nouvelUtilisateur.save();

    // --- 5. CRÉATION DE LA BOUTIQUE LIÉE ---
    const nouvelleBoutique = new Boutique({
      nom: cleanBoutique,
      userId: userSaved._id, 
      secteurActivite,
      deviseParDefaut,
      tailleBusiness
    });

    const boutiqueSaved = await nouvelleBoutique.save();

    // Assignation de la boutique active
    userSaved.boutiqueActive = boutiqueSaved._id;
    await userSaved.save();

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
        html: emailHtml // Utilise ta variable emailHtml ici
      });
    } catch (mailError) {
      console.error("Erreur SMTP :", mailError.message);
    }

    return res.status(201).json({ 
      success: true, 
      message: "Compte et Boutique créés ! Vérifiez vos emails pour l'activer." 
    });

  } catch (error) {
    console.error("Erreur Register:", error);
    return res.status(500).json({ status: "error", message: "Erreur technique lors de l'enregistrement." });
  }
};

/**
 * LOGIQUE DE CONNEXION (Login - Étape 1 : Password ➔ Génération OTP)
 */
/**
 * Helper : Génère le template HTML professionnel pour l'envoi de l'OTP
 * Placé EN DEHORS du contrôleur pour de meilleures performances mémoire.
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
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; color: #6366f1; letter-spacing: 10px; display: block; margin-right: -10px;">
              ${formattedOtp}
            </span>
          </div>

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center; line-height: 1.5;">
              <strong style="color: #ef4444;">Note de sécurité :</strong> Ce code expirera dans 3 minutes.<br>
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

const sendSecurityAlertEmailSafely = async (email, type, attemptsLeft = 0) => {
  try {
    await sendSecurityAlertEmail(email, type, attemptsLeft);
  } catch (mailError) {
    console.error("Erreur SMTP lors de l'envoi de l'alerte securite :", mailError.message);
  }
};

/**
 * LOGIQUE DE CONNEXION (Login)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Utilisateur.findOne({ email: email.toLowerCase().trim() })
      .select("+password +otpCode +otpExpires +loginAttempts +lockUntil +isPermanentlyBlocked")
      .populate("boutiqueActive");

    if (!user) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        message: "Veuillez activer votre compte via l'email reçu lors de l'inscription." 
      });
    }

    if (user.isPermanentlyBlocked) {
      return res.status(403).json({ message: "Compte bloqué. Contactez le support" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Compte suspendu. Contactez un administrateur." });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesRestantes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ 
        message: `Compte bloqué temporairement. Réessayez dans ${minutesRestantes} min.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;
      let responseMessage = "Identifiants incorrects";
      let status = 401;

      if (user.loginAttempts >= 7) {
        user.isPermanentlyBlocked = true;
        responseMessage = "Compte bloqué. Contactez le support";
        status = 403;
        await sendSecurityAlertEmailSafely(user.email, "banned");
      } else if (user.loginAttempts === 6) {
        user.lockUntil = Date.now() + 60 * 60 * 1000; // 1h
        responseMessage = "Compte bloqué temporairement (1h)";
        status = 403;
        await sendSecurityAlertEmailSafely(user.email, "critical");
      } else if (user.loginAttempts >= 4) {
        const reste = 6 - user.loginAttempts;
        responseMessage = `Attention, encore ${reste} tentative(s) avant blocage`;
        await sendSecurityAlertEmailSafely(user.email, "warning", reste);
      }

      await user.save();
      return res.status(status).json({ message: responseMessage });
    }

    // Configuration de l'OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpires = Date.now() + 3 * 60 * 1000; // Valable 3 minutes
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    // Envoi de l'email
    try {
      await sendEmail({
        email: user.email,
        subject: `Votre code StockMaster : ${otp}`,
        html: renderOtpEmail(user.prenom, otp) 
      });
    } catch (mailError) {
      console.error("Erreur SMTP lors de l'envoi de l'OTP :", mailError.message);
    }

    // Réponse structurée pour le front-end Next.js
    return res.status(200).json({ 
      success: true, 
      requiresOTP: true,
      message: "Code de vérification envoyé",
      email: user.email,
      hasBoutique: !!user.boutiqueActive 
    });

  } catch (error) {
    console.error("Erreur serveur détaillée Login :", error);
    return res.status(500).json({ message: "Erreur lors de la connexion" });
  }
};

 
/**
 * Vérification de l'email et activation du compte
 * Route: GET /api/auth/verify-email/:token ou GET /api/auth/verify-email?token=...
 */
export const verifyEmail = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    // Récupération flexible : fonctionne que le token soit dans l'URL (:token) ou en paramètre de requête (?token=)
    const token = req.params.token || req.query.token;

    console.log("[Verify-Email] Token reçu :", token);

    if (!token) {
      console.log("[Verify-Email] Aucun token fourni");
      return res.redirect(`${frontendUrl}/verify-email?status=invalid`);
    }

    // 1. Chercher l’utilisateur possédant ce token
    const user = await Utilisateur.findOne({ activationToken: token });

    if (!user) {
      console.log("[Verify-Email] Aucun utilisateur trouvé pour ce token");
      return res.redirect(`${frontendUrl}/verify-email?status=invalid`);
    }

    // 2. Vérifier si le token a expiré
    if (user.activationTokenExpires && user.activationTokenExpires < Date.now()) {
      console.log("[Verify-Email] Le token a expiré pour :", user.email);
      return res.redirect(`${frontendUrl}/verify-email?status=expired`);
    }

    // 3. Vérifier si le compte est déjà activé
    if (user.isActive) {
      console.log("[Verify-Email] Compte déjà actif pour :", user.email);
      return res.redirect(`${frontendUrl}/verify-email?status=already`);
    }

    // 4. Activation du compte et nettoyage des jetons éphémères
    user.isActive = true;
    user.emailVerifiedAt = new Date();
    user.activationToken = undefined; // Supprime le champ dans MongoDB
    user.activationTokenExpires = undefined; // Supprime le champ dans MongoDB

    await user.save();

    console.log("[Verify-Email] COMPTE ACTIVÉ AVEC SUCCÈS :", user.email);

    // 5. Redirection finale vers la page de succès du Frontend Next.js
    return res.redirect(`${frontendUrl}/verify-email?status=success`);

  } catch (error) {
    console.error("[Verify-Email] Erreur critique :", error);
    return res.redirect(`${frontendUrl}/verify-email?status=error`);
  }
};

//fonction pour redmander un nouveau lien de validation du compte//
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'adresse email est requise." });
    }

    // 1. Nettoyage de l'email pour éviter les faux 404 (majuscules/espaces)
    const cleanEmail = email.toLowerCase().trim();

    const user = await Utilisateur.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user.isActive) {
      return res.status(400).json({ message: "Ce compte est déjà activé." });
    }

    // FIX : Récupérer le nom de la boutique associée à cet utilisateur
    const boutique = await Boutique.findOne({ userId: user._id });
    const nomDeLaBoutique = boutique ? boutique.nom : "votre boutique";

    // 2. Génération du nouveau token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    
    user.activationToken = verificationToken;
    user.activationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    await user.save();

    // 3. Préparation du lien
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
            Vous avez demandé un nouveau lien pour activer votre accès à l'espace <strong style="color: #0f172a;">${nomDeLaBoutique}</strong>. 
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
      
    // 4. Envoi du mail
    try {
      await sendEmail({
        email: user.email,
        subject: "Nouveau lien de vérification - StockMaster Pro",
        html: emailHtml
      });
    } catch (mailError) {
      console.error("Erreur SMTP lors du renvoi :", mailError.message);
      // Optionnel : Tu peux décider de renvoyer une 500 ici si l'envoi échoue vraiment,
      // mais laisser le flux continuer évite de bloquer l'utilisateur si le mail part quand même en tâche de fond.
    }

    return res.status(200).json({ 
      success: true, 
      message: "Nouveau lien envoyé avec succès !" 
    });

  } catch (error) {
    console.error("Erreur serveur lors du renvoi :", error);
    return res.status(500).json({ message: "Erreur serveur lors du renvoi." });
  }
};



//fonction pour verifier le code otp 
export const verifyOTP = async (req, res) => {
  try {
    // 1. Extraction et validation stricte des données d'entrée
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email et code OTP requis." });
    }

    // 2. Récupération de l'utilisateur
    const user = await Utilisateur.findOne({ email })
      .select("+otpCode +otpExpires +loginAttempts +isPermanentlyBlocked")
      .populate("boutiqueActive");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // 3. Sécurité : Vérifier si le compte n'est pas bloqué de base
    if (user.isPermanentlyBlocked) {
      return res.status(403).json({ message: "Ce compte est bloqué. Contactez un administrateur." });
    }

    // 4. Vérifier si le code est expiré
    if (user.isBlocked) {
      return res.status(403).json({ message: "Compte suspendu. Contactez un administrateur." });
    }

    if (!user.otpExpires || user.otpExpires < Date.now()) {
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.loginAttempts = 0; // On reset pour sa prochaine tentative de login
      await user.save();
      return res.status(400).json({ message: "Le code a expiré. Demandez-en un nouveau." });
    }

    // 5. PROTECTION BRUTE-FORCE & COMPARISON STRICTE (Gestion des zéros initiaux)
    const formattedDbOtp = String(user.otpCode).padStart(6, "0");
    const formattedInputOtp = String(otp).padStart(6, "0");

    if (formattedDbOtp !== formattedInputOtp) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 3) {
        // L'utilisateur a échoué 3 fois : on nettoie TOUT pour le forcer à recommencer du début
        user.otpCode = undefined;
        user.otpExpires = undefined;
        user.loginAttempts = 0; // Reset ici pour qu'il ne soit pas bloqué à sa prochaine reconnexion
        await user.save();
        
        return res.status(429).json({ 
          message: "Trop de tentatives infructueuses. Sécurité activée, veuillez vous reconnecter." 
        });
      }

      await user.save();
      return res.status(400).json({ 
        message: `Code de vérification incorrect. Il vous reste ${3 - user.loginAttempts} tentatives.` 
      });
    }

    // 6. SI LE CODE EST BON : Réinitialisation complète
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.loginAttempts = 0; 
    await user.save();

    // 7. APPLICATION DE LA RÈGLE D'OR (Architecture Permission-Driven)
    if (!user.boutiqueActive) {
      return res.status(400).json({ 
        message: "Aucune boutique active configurée. Contactez le support." 
      });
    }

    let finalPermissions = [];
    const isAdminGeneral = user.boutiqueActive.userId.toString() === user._id.toString();

    if (isAdminGeneral) {
      const allPermissions = await Permission.find({});
      finalPermissions = allPermissions.map(p => p.nom);
    } else {
      if (!user.roleId) {
        return res.status(403).json({ message: "Accès refusé. Aucun rôle n'a été attribué." });
      }
      const rolePermissions = await RolePermission.find({ roleId: user.roleId }).populate("permissionId");
      finalPermissions = rolePermissions.map(rp => rp.permissionId?.nom).filter(Boolean);
    }

    // 8. Générer le Token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        boutiqueId: user.boutiqueActive._id,
        permissions: finalPermissions 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 9. Réponse Réussie
     return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone,
        avatar: user.avatar || "",
        roleId: user.roleId, 
        departementId: user.departementId || null, // <-- AJOUT ICI
        boutiqueActive: user.boutiqueActive 
      },
      permissions: finalPermissions, 
      message: "Connexion réussie ! Bienvenue sur StockMaster."
    });

  } catch (error) {
    console.error("Erreur verifyOTP:", error);
    return res.status(500).json({ message: "Erreur lors de la vérification du code" });
  }
};


//fonction pour redmander un nouveau code otp
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "L'email est requis." });
    }

    // 1. Récupération avec les infos de sécurité (Ajout de isPermanentlyBlocked pour bloquer le spam)
    const user = await Utilisateur.findOne({ email }).select("+prenom +otpExpires +isPermanentlyBlocked");
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Sécurité : Un compte banni ne doit pas pouvoir déclencher des envois de mails
    if (user.isPermanentlyBlocked) {
      return res.status(403).json({ message: "Ce compte est bloqué. Action impossible." });
    }

    // 2. SYSTEME ANTI-SPAM ALIGNÉ SUR LE TIMER FRONTEND (45 secondes)
    // Validité totale : 3 min (180 000 ms). Cooldown attendu : 45 secondes (45 000 ms).
    // Si la différence (otpExpires - maintenant) est > 135 000 ms, c'est que les 45s ne sont pas passées.
    if (user.otpExpires && (user.otpExpires - Date.now() > 135000)) {
      const timeLeft = Math.ceil((user.otpExpires - Date.now() - 135000) / 1000);
      return res.status(429).json({ 
        message: `Veuillez patienter encore ${timeLeft}s avant de redemander un code.` 
      });
    }

    // 3. Générer le nouveau code (6 chiffres)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Mettre à jour l'utilisateur (Validité de 3 minutes pour tolérance réseau)
    user.otpCode = newOtp;
    user.otpExpires = Date.now() + 3 * 60 * 1000; // 3 minutes en millisecondes
    await user.save();

    // 5. Code formaté pour une lecture facile (ex: 123 456)
    const formattedOtp = newOtp.split('').map((char, i) => i === 2 ? char + ' ' : char).join('');

    // Template HTML de l'email (CORRIGÉ : Changement à 3 minutes dans le texte)
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
                  ${formattedOtp}
                </span>
              </div>

              <p style="margin-top: 35px; font-size: 13px; color: #64748b;">
                Ce code est strictement confidentiel et expirera dans <strong style="color: #ef4444;">3 minutes</strong>.
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
        email: email, 
        subject: `[ACTION REQUISE] Votre nouveau code StockMaster : ${newOtp}`,
        html: emailOtp
      });

      return res.status(200).json({ 
        success: true, 
        message: "Nouveau code envoyé ! Vérifiez vos emails." 
      });

    } catch (mailError) {
      console.error("Erreur SMTP :", mailError.message);
      return res.status(500).json({ message: "Le serveur mail est surchargé. Réessayez." });
    }

  } catch (error) {
    console.error("Erreur resendOTP:", error);
    return res.status(500).json({ message: "Erreur lors de l'envoi du nouveau code" });
  }
};

// fonction pour le mot de passe oublié
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validation de la présence de l'email pour éviter un crash 500
    if (!email || typeof email !== "string") {
      return res.status(400).json({ 
        status: "error", 
        message: "Veuillez fournir une adresse email valide." 
      });
    }

    const cleanedEmail = email.toLowerCase().trim();
    const user = await Utilisateur.findOne({ email: cleanedEmail });

    // Message unifié pour la sécurité (évite de révéler si l'email existe)
    const successResponse = { 
      status: "success", 
      message: "Si ce compte existe, un email de récupération a été envoyé." 
    };

    if (!user) {
      // On s'arrête ici mais on renvoie un statut 200 de succès trompeur pour les attaquants
      return res.status(200).json(successResponse);
    }

    // 2. Génération du token de récupération
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Stockage sécurisé (version hachée) dans la BDD
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 3600000; // Valable 1 heure

    await user.save();

    // 3. Construction du lien avec le token brut (non haché)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

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
            <td style="padding: 50px 40px; text-align: center;">
              <h2 style="font-size: 22px; color: #0f172a; margin: 0 0 15px 0; font-weight: 700;">Réinitialisation de mot de passe</h2>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 35px 0;">
                Bonjour <strong style="color: #0f172a;">${user.prenom}</strong>,<br>
                Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte StockMaster. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
              </p>

              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #6366f1; color: #ffffff; padding: 18px 35px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
                  Réinitialiser mon mot de passe
                </a>
              </div>

              <p style="margin-top: 35px; font-size: 13px; color: #64748b;">
                Ce lien est valable pendant <strong style="color: #0f172a;">60 minutes</strong>. Passé ce délai, vous devrez effectuer une nouvelle demande.
              </p>

              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                  <strong>Note de sécurité :</strong> Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel restera inchangé.
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

    // 4. Envoi effectif de l'email
    await sendEmail({
      email: user.email,
      subject: "Réinitialisation de votre mot de passe - StockMaster",
      html: emailHtml
    });

    return res.status(200).json(successResponse);

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({ status: "error", message: "Erreur technique." });
  }
};

// fonction pour réinitialiser le mot de passe
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params; 
    const { password, confirmPassword } = req.body;

    // ==========================================
    // PHASE 0 : SÉCURITÉ DES ENTRÉES (Anti-crash)
    // ==========================================
    if (!token) {
      return res.status(400).json({ status: "error", message: "Le jeton de réinitialisation est requis." });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ status: "error", message: "Tous les champs sont requis." });
    }

    // ==========================================
    // PHASE 1 : VALIDATION DE LA COHÉRENCE
    // ==========================================
    
    // 1. Vérification de correspondance
    if (password !== confirmPassword) {
      return res.status(400).json({ status: "error", message: "Les mots de passe ne correspondent pas." });
    }

    // 2. Validation de la force du mot de passe
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

    // [⚠️ ATTENTION PIÈGE MONGOOSE] :
    // SI tu as un hook 'pre-save' de hachage dans ton modèle Utilisateur, écris juste :
    // user.password = password;
    //
    // SINON (si tu n'as pas de hook automatique), garde le hachage manuel ci-dessous :
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    // 2. Nettoyage (Usage unique du token)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // 3. Sauvegarde dans MongoDB
    await user.save();

    return res.status(200).json({ 
      status: "success", 
      message: "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez vous connecter." 
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ status: "error", message: "Erreur technique lors de la réinitialisation." });
  }
};

//Fontion pour renvoyer le mot de passe oublié
export const resendForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Validation préventive anti-crash
    if (!email || typeof email !== "string") {
      return res.status(400).json({ 
        status: "error", 
        message: "Veuillez fournir une adresse email valide." 
      });
    }

    const cleanedEmail = email.toLowerCase().trim();
    const user = await Utilisateur.findOne({ email: cleanedEmail });

    // Message strictement identique pour éviter l'énumération (Sécurité)
    const successResponse = { 
      status: "success", 
      message: "Si ce compte existe, un nouveau lien de réinitialisation a été envoyé." 
    };

    if (!user) {
      return res.status(200).json(successResponse);
    }

    // 2. Génération d'un NOUVEAU token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 heure

    await user.save();

    // 3. Construction du lien
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 4. Envoi de l'email
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

    return res.status(200).json(successResponse);

  } catch (error) {
    console.error("RESEND ERROR:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Erreur lors du renvoi du lien." 
    });
  }
};

//fonction pour les informations de l'utilisateur connecté//
export const getMe = async (req, res) => {
  try {
    // 1. Sécurité : 'req.user' injecté par ton middleware 'protect'
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        status: "error", 
        message: "Non autorisé. Session manquante ou expirée." 
      });
    }

    const userId = req.user.id; 

    // 2. LA MAGIE DU POPULATE : On récupère l'utilisateur ET sa boutique active
    // pour pouvoir inspecter qui en est le propriétaire (userId)
    const user = await Utilisateur.findById(userId)
      .select('-password')
      .populate('boutiqueActive')
      .populate('roleId')
      .populate('departementId');
    
    if (!user) {
      return res.status(404).json({ 
        status: "error", 
        message: "Utilisateur non trouvé." 
      });
    }

    let sesPermissions = [];

    // ==========================================
    // APPLICATION DE LA RÈGLE D'OR
    // ==========================================
    const isOwner = user.boutiqueActive && 
                    user.boutiqueActive.userId.toString() === user._id.toString();

    if (isOwner) {
      // CAS 1 : C'est le grand patron (Admin Général)
      // On ignore le champ roleId et on lui octroie l'INTEGRALITÉ des permissions (Seeding)
      const toutesLesPermissions = await Permission.find({});
      sesPermissions = toutesLesPermissions.map(p => p.nom); 
    } else if (user.roleId) {
      // CAS 2 : C'est un employé
      // On fouille la table pivot RolePermission pour extraire ses droits spécifiques
      const lignesPivot = await RolePermission.find({ roleId: user.roleId }).populate('permissionId');
      
      // Extraction propre des chaînes de caractères (ex: "EFFECTUER_VENTE")
      sesPermissions = lignesPivot
        .filter(pivot => pivot.permissionId) // Sécurité si une permission venait à être supprimée du seeding
        .map(pivot => pivot.permissionId.nom); 
    }

    // 3. Envoi de la réponse parfaitement alignée avec ton composant Next.js
    return res.status(200).json({
      status: "success",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone || "",
        roleId: user.roleId?._id || user.roleId || null,
        role: user.roleId?.nom || (isOwner ? "Admin GÃ©nÃ©ral" : "EmployÃ©"),
        departementId: user.departementId || null, // <-- AJOUT ICI
        departement: user.departementId?.nom || "",
        avatar: user.avatar || "",
        boutiqueActive: user.boutiqueActive ? user.boutiqueActive._id : "",
        boutique: user.boutiqueActive ? {
          id: user.boutiqueActive._id,
          nom: user.boutiqueActive.nom,
          secteurActivite: user.boutiqueActive.secteurActivite,
          deviseParDefaut: user.boutiqueActive.deviseParDefaut,
          tailleBusiness: user.boutiqueActive.tailleBusiness
        } : null
      },
      permissions: sesPermissions 
    });

  } catch (error) {
    console.error("Erreur critique dans getMe :", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Erreur serveur interne lors de la récupération du profil." 
    });
  }
};

// ==========================================
// CONFIGURATIONS DE SÉCURITÉ & UTILS (Mis à jour pour Rôles Dynamiques)
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
  if (!user) return null;

  // 1. On détermine le nom du rôle à afficher
  let affichageRole = "Propriétaire"; 
  if (user.roleId) {
    affichageRole = typeof user.roleId === 'object' && user.roleId.nom 
      ? user.roleId.nom 
      : "Employé";
  }

  // 2. On détermine le nom du département à afficher <-- AJOUT ICI
  let affichageDepartement = "Non spécifié";
  if (user.departementId) {
    affichageDepartement = typeof user.departementId === 'object' && user.departementId.nom
      ? user.departementId.nom
      : "Assigné";
  }

  return {
    id: user._id,
    prenom: user.prenom || "",
    nom: user.nom || "",
    email: user.email || "",
    
    roleId: (user.roleId && typeof user.roleId === 'object') ? user.roleId._id : user.roleId || null, 
    departementId: (user.departementId && typeof user.departementId === 'object') ? user.departementId._id : user.departementId || null, // <-- AJOUT ICI
    avatar: user.avatar || "",
    boutiqueActive: user.boutiqueActive?._id || user.boutiqueActive || "",
    
    role: affichageRole, 
    departement: affichageDepartement, // <-- AJOUT ICI ("RH", "Ventes"...)
    
    firstName: user.prenom || "",
    lastName: user.nom || "",
    phone: user.telephone || "",
    telephone: user.telephone || "",
    bio: user.bio || "Gestionnaire principal de la plateforme commerciale.",
    country: user.boutiqueActive ? "République Démocratique du Congo" : "Non spécifié",
    city: user.city || "",
    postalCode: user.postalCode || "N/A",
    taxId: user.taxId || ""
  };
};

// ==========================================
// CONTROLEURS
// ==========================================

// 1. Récupérer les informations du profil connecté
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }
    
    // Récupération de l'utilisateur avec ses liaisons
     // Modifie la ligne de récupération :

    const user = await Utilisateur.findById(userId)
      .populate('boutiqueActive')
      .populate('roleId')
      .populate('departementId'); // <-- AJOUT ICI

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    return res.status(200).json(formatProfileResponse(user));

  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};


// 2. Mettre à jour les informations du profil connecté
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; 

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }

    const userCheck = await Utilisateur.findById(userId);
    if (!userCheck) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    // Prise en compte de "bio" envoyée par le front-end
    const { prenom, nom, firstName, lastName, email, telephone, phone, city, taxId, postalCode, avatar, bio } = req.body;

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

    // --- FILTRAGE DES DONNÉES ---
    let donneesMiseAJour = {};

    // Restriction si l'utilisateur a un rôle (Employé / Caissier / RH...)
    if (userCheck.roleId !== null && userCheck.roleId !== undefined && userCheck.roleId !== "") {
      donneesMiseAJour = {
        telephone: telephone || phone,
        avatar
      };
    } else {
      // Admin Général / Propriétaire de la boutique
      donneesMiseAJour = {
        prenom: prenom || firstName,
        nom: nom || lastName,
        email,
        telephone: telephone || phone,
        city,
        taxId,
        postalCode,
        avatar,
        bio // Sauvegarde désormais la biographie modifiée
      };
    }

    // --- APPLICATION DE LA MISE À JOUR ---
    const isEmploye = userCheck.roleId !== null && userCheck.roleId !== undefined && userCheck.roleId !== "";
    const permissions = req.user?.permissions || [];
    const canEditTotal = !isEmploye || permissions.includes("MODIFIER_PROFIL_TOTAL");
    const canEditRestricted = canEditTotal || permissions.includes("MODIFIER_PROFIL_RESTREINT");

    if (!canEditRestricted) {
      return res.status(403).json({
        error: "Vous n'avez pas la permission de modifier votre profil."
      });
    }

    if (canEditTotal) {
      donneesMiseAJour = {
        prenom: prenom || firstName,
        nom: nom || lastName,
        email,
        telephone: telephone || phone,
        city,
        taxId,
        postalCode,
        avatar,
        bio
      };
    } else {
      donneesMiseAJour = {
        email,
        telephone: telephone || phone,
        bio
      };
    }

    Object.keys(donneesMiseAJour).forEach((key) => {
      if (donneesMiseAJour[key] === undefined) {
        delete donneesMiseAJour[key];
      }
    });

    const updatedUser = await Utilisateur.findByIdAndUpdate(
      userId,
      { $set: donneesMiseAJour },
      { new: true, runValidators: true }
    ).populate('boutiqueActive').populate('roleId').populate('departementId'); 

    return res.status(200).json(formatProfileResponse(updatedUser));
    
  } catch (error) {
    console.error("Erreur updateProfile:", error);
    return res.status(500).json({ error: "Erreur lors de la mise à jour du profil." });
  }
};

// Changer le mot de passe avec validation stricte
export const updatePassword = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Accès non autorisé. Utilisateur non identifié." });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Le mot de passe actuel, le nouveau mot de passe et la confirmation sont requis." });
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
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Les nouveaux mots de passe ne correspondent pas." });
    }

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

import nodemailer from "nodemailer";

/**
 * Service d'envoi d'email pour StockMaster Pro
 */
export const sendEmail = async (options) => {
  // 1. Créer le transporteur avec des paramètres de timeout pour éviter que le serveur ne freeze
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Utilise SSL pour le port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Ton code de 16 lettres Gmail
    },
    // --- AJOUTS CRITIQUES ---
    connectionTimeout: 5000, // Abandonne après 5 secondes si pas de réponse
    greetingTimeout: 5000,
    socketTimeout: 5000,
    tls: {
      rejectUnauthorized: false // Permet de passer outre certains blocages de certificats sur Render
    }
  });

  // 2. Définir le contenu du mail
  const mailOptions = {
    from: `"StockMaster Pro" <${process.env.EMAIL_USER}>`, // Utilise ton email vérifié pour éviter les spams
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3. Envoyer
  // On ne met pas de "await" ici si on veut que la réponse serveur soit instantanée,
  // MAIS il vaut mieux le laisser et compter sur le timeout de 5s défini plus haut.
  await transporter.sendMail(mailOptions);
};
import nodemailer from "nodemailer";

/**
 * Service d'envoi d'email pour StockMaster Pro
 */
export const sendEmail = async (options) => {
  // 1. Créer le transporteur (le moteur d'envoi)
  const transporter = nodemailer.createTransport({
    service: "gmail", 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2. Définir le contenu du mail
  const mailOptions = {
    from: '"StockMaster Pro" <no-reply@stockmaster.com>',
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3. Envoyer réellement
  await transporter.sendMail(mailOptions);
};
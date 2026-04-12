import nodemailer from "nodemailer";

/**
 * Service d'envoi d'email pour StockMaster Pro
 * Configuration optimisée pour Render (Force IPv4 + Port 587)
 */
export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // false pour le port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // --- CONFIGURATION ANTI-BLOCAGE RENDER ---
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000,
    dnsTimeout: 5000,
    // Force l'utilisation de l'adresse IPv4 de Gmail
    family: 4, 
    tls: {
      // Indispensable pour le port 587
      ciphers: 'SSLv3',
      rejectUnauthorized: false 
    }
  });

  const mailOptions = {
    from: `"StockMaster Pro" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    // On utilise l'hôte SMTP de Gmail
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // FORCE LE PASSAGE EN IPV4 (C'est ce qui règle le ENETUNREACH)
    family: 4, 
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    tls: {
      // Indispensable pour éviter les blocages de certificats sur Render
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    }
  });

  const mailOptions = {
    from: `"StockMaster Pro" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // On envoie le mail
  await transporter.sendMail(mailOptions);
};
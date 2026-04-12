import nodemailer from "nodemailer";

/**
 * SOLUTION ULTIME : Utilisation de l'IP directe IPv4 de Gmail
 * pour contourner les erreurs ENETUNREACH de Render.
 */
export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    // Utilisation de l'IP directe pour forcer l'IPv4
    // 142.251.10.108 est l'une des adresses IP stables de smtp.gmail.com
    host: "142.251.10.108", 
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Très important quand on utilise une IP directe
    servername: "smtp.gmail.com", 
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    }
  });

  const mailOptions = {
    // On s'assure que le "from" correspond bien à l'utilisateur authentifié
    from: `"StockMaster Pro" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // Envoi du mail
  await transporter.sendMail(mailOptions);
};
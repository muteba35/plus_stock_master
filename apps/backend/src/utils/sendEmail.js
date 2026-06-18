import nodemailer from "nodemailer";
import { Resend } from "resend";

const getDefaultEmailTemplate = ({ title, alertColor, iconUrl, bodyMessage, showButton, frontendUrl }) => `
  <div style="background-color: #F4F7FA; padding: 50px 15px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
      <div style="height: 5px; background-color: ${alertColor};"></div>

      <div style="background-color: #0F172A; padding: 35px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 4px; font-weight: 800; text-transform: uppercase;">
          STOCK<span style="color: #818CF8;">MASTER</span>
          <span style="font-size: 9px; color: #94A3B8; vertical-align: middle; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">PRO</span>
        </h1>
      </div>

      <div style="padding: 50px 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${iconUrl}" width="54" height="54" alt="Status Icon" style="display: block; margin: 0 auto;">
        </div>

        <h2 style="color: ${alertColor}; font-size: 12px; font-weight: 800; margin: 0 0 15px 0; letter-spacing: 1.5px; text-transform: uppercase; text-align: center;">
          ${title}
        </h2>

        <div style="color: #334155; font-size: 15px; line-height: 1.7; text-align: center; font-weight: 400;">
          ${bodyMessage}
        </div>

        ${showButton ? `
        <div style="text-align: center; margin-top: 45px;">
          <a href="${frontendUrl}/forgot-password"
             style="background-color: ${alertColor}; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 13px; display: inline-block; letter-spacing: 0.5px;">
            SECURISER MON COMPTE
          </a>
          <p style="margin-top: 25px; font-size: 12px; color: #94A3B8;">
            Si vous n'etes pas a l'origine de cette demande, veuillez ignorer cet email ou contacter votre administrateur.
          </p>
        </div>` : `
        <div style="margin-top: 40px; padding: 20px; border-radius: 10px; background-color: #F8FAFC; border: 1px dashed #E2E8F0; text-align: center;">
          <p style="font-size: 13px; color: #64748B; margin: 0;">
            Besoin d'assistance ? Contactez le support technique : <br>
            <a href="mailto:support@stockmaster.cd" style="color: #4F46E5; text-decoration: none; font-weight: 600;">support@stockmaster.cd</a>
          </p>
        </div>`}
      </div>

      <div style="background-color: #F8FAFC; padding: 30px; text-align: center; border-top: 1px solid #F1F5F9;">
        <p style="font-size: 11px; color: #94A3B8; margin: 0; line-height: 1.5;">
          <strong>STOCKMASTER SECURITY INFRASTRUCTURE</strong><br>
          Ceci est un message automatique de surveillance systeme.
        </p>
      </div>
    </div>
  </div>
`;

const createSmtpTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Configuration email incomplete: EMAIL_USER et EMAIL_PASS sont requis.");
  }

  const emailPort = Number(process.env.EMAIL_PORT || 587);
  const isGmail = process.env.EMAIL_HOST === "smtp.gmail.com" || !process.env.EMAIL_HOST;

  return nodemailer.createTransport(
    isGmail
      ? {
          host: "smtp.gmail.com",
          port: emailPort,
          secure: emailPort === 465,
          requireTLS: emailPort === 587,
          family: 4,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }
      : {
          host: process.env.EMAIL_HOST,
          port: emailPort,
          secure: emailPort === 465,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        }
  );
};

export const sendEmail = async (options) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  let title = "NOTIFICATION SYSTEME";
  let alertColor = "#4F46E5";
  let iconUrl = "https://cdn-icons-png.flaticon.com/512/1828/1828640.png";
  let bodyMessage = options.message || "";
  let showButton = true;

  if (options.type === "warning") {
    title = "AVERTISSEMENT DE SECURITE";
    alertColor = "#F59E0B";
    iconUrl = "https://cdn-icons-png.flaticon.com/512/564/564619.png";
    bodyMessage = `Nous avons detecte plusieurs echecs de connexion. Il ne reste que <strong>${options.attemptsLeft} tentative(s)</strong> avant la suspension de votre acces.`;
  } else if (options.type === "critical") {
    title = "ACCES SUSPENDU (1 HEURE)";
    alertColor = "#EF4444";
    iconUrl = "https://cdn-icons-png.flaticon.com/512/752/752755.png";
    bodyMessage = "Plusieurs tentatives de connexion suspectes ont ete constatees. Par mesure de precaution, votre compte est verrouille pour 1 heure. <strong>Veuillez changer votre mot de passe immediatement.</strong>";
  } else if (options.type === "banned") {
    title = "COMPTE BLOQUE DEFINITIVEMENT";
    alertColor = "#000000";
    iconUrl = "https://cdn-icons-png.flaticon.com/512/1053/1053181.png";
    bodyMessage = "Suite a une activite compromise, votre compte a ete definitivement verrouille. Seul l'administrateur peut lever cette restriction.";
    showButton = false;
  }

  const htmlContent = options.html || getDefaultEmailTemplate({
    title,
    alertColor,
    iconUrl,
    bodyMessage,
    showButton,
    frontendUrl,
  });

  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const info = await resend.emails.send({
        from: process.env.EMAIL_FROM || "StockMaster <onboarding@resend.dev>",
        to: options.email,
        subject: options.subject || "Notification StockMaster Pro",
        html: htmlContent,
      });

      console.log(`Email Resend envoye a ${options.email}`);
      return info;
    }

    const transporter = createSmtpTransporter();
    const info = await transporter.sendMail({
      from: `"StockMaster Pro Security" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject || "Notification StockMaster Pro",
      html: htmlContent,
    });

    console.log(`Email SMTP envoye a ${options.email}`);
    return info;
  } catch (error) {
    console.error("Erreur email:", error);
    throw error;
  }
};

export const sendSecurityAlertEmail = async (email, type, attemptsLeft = 0) => {
  const subjectMap = {
    warning: "[SECURITE] Avertissement : Tentatives de connexion",
    critical: "[RESTRICTION] Urgent : Acces temporairement suspendu",
    banned: "[ALERTE] Verrouillage definitif du compte professionnel",
  };

  return await sendEmail({
    email,
    type,
    attemptsLeft,
    subject: subjectMap[type] || "[INFO] Notification StockMaster Pro",
  });
};

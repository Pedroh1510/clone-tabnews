import { ServiceError } from "infra/errors.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  secure: process.env.EMAIL_SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
});

async function send({ from, to, subject, body, html }) {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html,
    });
    return {
      messageId: info.messageId,
    };
  } catch (error) {
    throw new ServiceError({
      message: "Falha ao enviar email",
      cause: error,
      action: "Verifique as configurações de email e tente novamente.",
      context: {
        from,
        to,
        subject,
        body,
      },
    });
  }
}

async function verifyConnection() {
  try {
    return transporter.verify();
  } catch {
    return false;
  }
}

const email = {
  send,
  verifyConnection,
};

export default email;

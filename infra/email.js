import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
});

async function send({ to, subject, body, html }) {
  const info = await transporter.sendMail({
    from: `"Service Team" <${process.env.EMAIL_SMTP_FROM}>`,
    to,
    subject,
    text: body,
    html,
  });
  return {
    messageId: info.messageId,
  };
}

async function verifyConnection() {
  try {
    return transporter.verify();
  } catch (error) {
    return false;
  }
}

const email = {
  send,
  verifyConnection,
};

export default email;

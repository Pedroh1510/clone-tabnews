import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function send({ to, subject, body, html }) {
  const info = await transporter.sendMail({
    from: `"Service Team" <${process.env.SMTP_EMAIL}>`,
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

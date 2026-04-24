import nodemailer from "nodemailer";

const REQUIRED_ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

const validateSmtpEnv = () => {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing SMTP env vars: ${missing.join(", ")}`);
  }
};

const getTransporter = () => {
  validateSmtpEnv();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const getAdminCc = () => {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  return adminEmail || undefined;
};

export const sendApplicationApprovedEmail = async ({
  recipients,
  studentName,
  applicationId,
  pdfBuffer,
}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { sent: false, count: 0 };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipients.join(","),
    cc: getAdminCc(),
    subject: "Internship Application Approved",
    text: `Dear Student,\n\nYour internship application (ID: ${applicationId}) has been approved.\nPlease find the approval letter attached.\n\nRegards,\nSchool of Legal Studies`,
    html: `
      <p>Dear Student,</p>
      <p>Your internship application <strong>(ID: ${applicationId})</strong> has been approved.</p>
      <p>Please find the approval letter attached.</p>
      <p>Regards,<br/>School of Legal Studies</p>
    `,
    attachments: [
      {
        filename: `${studentName || "student"}-application-${applicationId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  return { sent: true, count: recipients.length };
};

export const sendApplicationEmailToAuthority = async ({
  authorityEmail,
  authorityName,
  authorityPlace,
  applicationId,
  studentName,
  emailText,
  emailHtml,
}) => {
  const to = String(authorityEmail || "").trim();
  if (!to) {
    return { sent: false };
  }

  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM;
  const from = fromAddress.includes("<")
    ? fromAddress
    : `"School of Legal Studies" <${fromAddress}>`;

  await transporter.sendMail({
    from,
    to,
    cc: getAdminCc(),
    subject: `Internship Application Request - ID ${applicationId}`,
    text:
      emailText ||
      (`From: School of Legal Studies\n` +
        `To: ${authorityName || "Applying Authority"}\n` +
        `Subject: Internship Application Request - ID ${applicationId}\n\n` +
        `Dear ${authorityName || "Sir/Madam"},\n\n` +
        `Greetings from the School of Legal Studies.\n\n` +
        `This is to kindly request your support for internship consideration in connection with student application ID ${applicationId}.` +
        `${studentName ? ` The first listed student is ${studentName}.` : ""}\n` +
        `${authorityPlace ? `Place: ${authorityPlace}\n` : ""}\n` +
        `Please let us know if any additional information or documents are required.\n\n` +
        `Sincerely,\n` +
        `School of Legal Studies`),
    html:
      emailHtml ||
      `
      <p><strong>From:</strong> School of Legal Studies</p>
      <p><strong>To:</strong> ${authorityName || "Applying Authority"}</p>
      <p><strong>Subject:</strong> Internship Application Request - ID ${applicationId}</p>
      <p>Dear ${authorityName || "Sir/Madam"},</p>
      <p>Greetings from the School of Legal Studies.</p>
      <p>
        This is to kindly request your support for internship consideration in connection with
        student application ID <strong>${applicationId}</strong>.
        ${studentName ? ` The first listed student is <strong>${studentName}</strong>.` : ""}
      </p>
      ${authorityPlace ? `<p><strong>Place:</strong> ${authorityPlace}</p>` : ""}
      <p>Please let us know if any additional information or documents are required.</p>
      <p>Sincerely,<br/>School of Legal Studies</p>
    `,
  });

  return { sent: true };
};

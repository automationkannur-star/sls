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

const getFromAddress = (institution) => {
  const normalizedInstitution = String(institution || "").trim().toLowerCase();
  if (normalizedInstitution === "mjs") {
    return (
      String(process.env.SMTP_FROM_MJS || "").trim() ||
      String(process.env.SMTP_FROM || "").trim()
    );
  }
  return String(process.env.SMTP_FROM || "").trim();
};

export const sendApplicationApprovedEmail = async ({
  recipients,
  studentName,
  applicationId,
  pdfBuffer,
  institution,
}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { sent: false, count: 0 };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getFromAddress(institution),
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
  institution,
  ccRecipients,
}) => {
  const to = String(authorityEmail || "").trim();
  if (!to) {
    return { sent: false };
  }

  const transporter = getTransporter();
  const fromAddress = getFromAddress(institution);
  const from = fromAddress.includes("<")
    ? fromAddress
    : `"School of Legal Studies" <${fromAddress}>`;
  const adminCc = getAdminCc();
  const normalizedCcRecipients = Array.isArray(ccRecipients)
    ? ccRecipients.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const ccList = [...new Set([...(adminCc ? [adminCc] : []), ...normalizedCcRecipients])];

  await transporter.sendMail({
    from,
    to,
    cc: ccList.length > 0 ? ccList.join(",") : undefined,
    subject: `Internship Application Request - School of Legal Studies, Palayad`,
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

export const sendNewApplicationAdminEmail = async ({
  applicationId,
  students,
  needsAuthorityRequest,
  authorityDetails,
  institution,
}) => {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  if (!adminEmail) {
    return { sent: false };
  }

  const normalizedStudents = Array.isArray(students) ? students : [];
  const firstStudent = normalizedStudents[0] || {};
  const authorityName = String(authorityDetails?.authorityName || "").trim();
  const authorityPlace = String(authorityDetails?.place || "").trim();
  const authorityEmail = String(authorityDetails?.email || "").trim();

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getFromAddress(institution),
    to: adminEmail,
    subject: `New Internship Application Submitted - ID ${applicationId}`,
    text:
      `A new internship application has been submitted.\n\n` +
      `Application ID: ${applicationId}\n` +
      `Students Count: ${normalizedStudents.length}\n` +
      `First Student: ${String(firstStudent?.studentName || "-").trim() || "-"}\n` +
      `First Student Email: ${String(firstStudent?.email || "-").trim() || "-"}\n` +
      `Authority Request: ${needsAuthorityRequest ? "Yes" : "No"}\n` +
      `${needsAuthorityRequest ? `Authority Name: ${authorityName || "-"}\n` : ""}` +
      `${needsAuthorityRequest ? `Authority Place: ${authorityPlace || "-"}\n` : ""}` +
      `${needsAuthorityRequest ? `Authority Email: ${authorityEmail || "-"}\n` : ""}`,
    html: `
      <p>A new internship application has been submitted.</p>
      <ul>
        <li><strong>Application ID:</strong> ${applicationId}</li>
        <li><strong>Students Count:</strong> ${normalizedStudents.length}</li>
        <li><strong>First Student:</strong> ${
          String(firstStudent?.studentName || "-").trim() || "-"
        }</li>
        <li><strong>First Student Email:</strong> ${
          String(firstStudent?.email || "-").trim() || "-"
        }</li>
        <li><strong>Authority Request:</strong> ${
          needsAuthorityRequest ? "Yes" : "No"
        }</li>
        ${
          needsAuthorityRequest
            ? `<li><strong>Authority Name:</strong> ${authorityName || "-"}</li>`
            : ""
        }
        ${
          needsAuthorityRequest
            ? `<li><strong>Authority Place:</strong> ${authorityPlace || "-"}</li>`
            : ""
        }
        ${
          needsAuthorityRequest
            ? `<li><strong>Authority Email:</strong> ${authorityEmail || "-"}</li>`
            : ""
        }
      </ul>
    `,
  });

  return { sent: true };
};

export const sendServiceRequestAdminEmail = async ({
  serviceRequestId,
  studentName,
  email,
  mobileNumber,
  admissionNumber,
  course,
  semester,
  batch,
  requestSubject,
  message,
  priority,
  uploadedFileUrls,
  status,
}) => {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  if (!adminEmail) {
    return { sent: false };
  }

  const normalizedUploadedFileUrls = Array.isArray(uploadedFileUrls)
    ? uploadedFileUrls.filter(Boolean)
    : [];

  const transporter = getTransporter();
  await transporter.sendMail({
    from: getFromAddress("sls"),
    to: adminEmail,
    subject: `New Student Request Submitted - ID ${serviceRequestId}`,
    text:
      `A new student request has been submitted.\n\n` +
      `Request ID: ${serviceRequestId}\n` +
      `Student Name: ${String(studentName || "-").trim() || "-"}\n` +
      `Email: ${String(email || "-").trim() || "-"}\n` +
      `Mobile Number: ${String(mobileNumber || "-").trim() || "-"}\n` +
      `Admission Number: ${String(admissionNumber || "-").trim() || "-"}\n` +
      `Course: ${String(course || "-").trim() || "-"}\n` +
      `Semester: ${String(semester || "-").trim() || "-"}\n` +
      `Batch: ${String(batch || "-").trim() || "-"}\n` +
      `Request Subject: ${String(requestSubject || "-").trim() || "-"}\n` +
      `Priority: ${String(priority || "-").trim() || "-"}\n` +
      `Status: ${String(status || "New").trim() || "New"}\n` +
      `Uploaded Files: ${
        normalizedUploadedFileUrls.length > 0
          ? normalizedUploadedFileUrls.join(", ")
          : "No files uploaded"
      }\n` +
      `Message:\n${String(message || "-").trim() || "-"}`,
    html: `
      <p>A new student request has been submitted.</p>
      <ul>
        <li><strong>Request ID:</strong> ${serviceRequestId}</li>
        <li><strong>Student Name:</strong> ${String(studentName || "-").trim() || "-"}</li>
        <li><strong>Email:</strong> ${String(email || "-").trim() || "-"}</li>
        <li><strong>Mobile Number:</strong> ${String(mobileNumber || "-").trim() || "-"}</li>
        <li><strong>Admission Number:</strong> ${
          String(admissionNumber || "-").trim() || "-"
        }</li>
        <li><strong>Course:</strong> ${String(course || "-").trim() || "-"}</li>
        <li><strong>Semester:</strong> ${String(semester || "-").trim() || "-"}</li>
        <li><strong>Batch:</strong> ${String(batch || "-").trim() || "-"}</li>
        <li><strong>Request Subject:</strong> ${
          String(requestSubject || "-").trim() || "-"
        }</li>
        <li><strong>Priority:</strong> ${String(priority || "-").trim() || "-"}</li>
        <li><strong>Status:</strong> ${String(status || "New").trim() || "New"}</li>
        <li><strong>Uploaded Files:</strong> ${
          normalizedUploadedFileUrls.length > 0
            ? normalizedUploadedFileUrls
                .map(
                  (url) =>
                    `<a href="${String(url)}" target="_blank" rel="noreferrer">${String(url)}</a>`
                )
                .join(", ")
            : "No files uploaded"
        }</li>
      </ul>
      <p><strong>Message:</strong></p>
      <p>${String(message || "-").trim() || "-"}</p>
    `,
  });

  return { sent: true };
};

export const sendStudentRequestReplyEmail = async ({
  toEmail,
  studentName,
  requestId,
  replyMessage,
  attachments,
}) => {
  const to = String(toEmail || "").trim();
  if (!to) {
    return { sent: false };
  }

  const transporter = getTransporter();
  const safeAttachments = Array.isArray(attachments)
    ? attachments.filter((item) => item && item.content)
    : [];

  await transporter.sendMail({
    from: getFromAddress("sls"),
    to,
    cc: getAdminCc(),
    subject: `Reply to Student Request #${requestId}`,
    text:
      `Dear ${String(studentName || "Student").trim() || "Student"},\n\n` +
      `${String(replyMessage || "").trim()}\n\n` +
      `Regards,\nSchool of Legal Studies Office`,
    html: `
      <p>Dear ${String(studentName || "Student").trim() || "Student"},</p>
      <p style="white-space:pre-wrap;">${String(replyMessage || "").trim()}</p>
      <p>Regards,<br/>School of Legal Studies Office</p>
    `,
    attachments: safeAttachments,
  });

  return { sent: true };
};

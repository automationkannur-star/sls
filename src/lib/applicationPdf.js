import path from "path";
import { readFile } from "fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";

const DEFAULT_TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "templates",
  "internship-template.html"
);
const INSTITUTION_TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "templates",
  "institution-template.html"
);
const SIGNATURE_PATH = path.join(
  process.cwd(),
  "src",
  "templates",
  "assets",
  "hod-signature-dummy.svg"
);
const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

export const parseStudents = (students) => {
  if (Array.isArray(students)) {
    return students;
  }

  if (typeof students === "string") {
    try {
      const parsedValue = JSON.parse(students);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  return [];
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildInstitutionFromBlockHtml = () => {
  const lines = [
    "The Head of the Department, School of Legal Studies,",
    "Dr. Janaki Ammal Campus, Palayad.",
  ];
  return lines.map((line) => escapeHtml(line)).join("<br/>");
};

const buildInstitutionToBlockHtml = (application) => {
  const name = String(application?.authority_name || "").trim();
  const place = String(application?.authority_place || "").trim();
  const email = String(application?.authority_email || "").trim();

  if (!name && !place && !email) {
    return "-";
  }

  const parts = [];
  if (name) {
    parts.push(escapeHtml(name));
  }
  if (place) {
    parts.push(escapeHtml(place));
  }
  if (email) {
    parts.push(`Email: ${escapeHtml(email)}`);
  }
  return parts.join("<br/>");
};

const buildInstitutionStudentTableHtml = (students) => {
  if (!Array.isArray(students) || students.length === 0) {
    return "";
  }

  const rows = students
    .map((student, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(student?.studentName || "-")}</td>
          <td>${escapeHtml(student?.admissionNumber || "-")}</td>
          <td>${escapeHtml(student?.semester || "-")}</td>
          <td>${escapeHtml(student?.batch || "-")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="inst-student-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Admission No</th>
          <th>Semester</th>
          <th>Batch year</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const buildInstitutionStudentDetailsBlockHtml = (students) => {
  if (!Array.isArray(students) || students.length === 0) {
    return "";
  }

  return `
    <div class="inst-student-heading pdf24_24 pdf24_11 pdf24_36" style="margin:0 0 0.35em 0;">
      Student Details:
    </div>
    ${buildInstitutionStudentTableHtml(students)}
  `;
};

const buildInstitutionStudentRowsForEmail = (students) => {
  if (!Array.isArray(students) || students.length === 0) {
    return "";
  }
  return students
    .map(
      (student, index) => `
        <tr>
          <td style="border:1px solid #6b7280;padding:8px;">${index + 1}</td>
          <td style="border:1px solid #6b7280;padding:8px;">${escapeHtml(student?.studentName || "-")}</td>
          <td style="border:1px solid #6b7280;padding:8px;">${escapeHtml(student?.admissionNumber || "-")}</td>
          <td style="border:1px solid #6b7280;padding:8px;">${escapeHtml(student?.semester || "-")}</td>
          <td style="border:1px solid #6b7280;padding:8px;">${escapeHtml(student?.batch || "-")}</td>
        </tr>
      `
    )
    .join("");
};

export const buildInstitutionEmailBodyHtml = (application) => {
  const students = parseStudents(application?.students);
  const submittedDate = new Date(application?.created_at || Date.now());
  const dateDisplay = submittedDate.toLocaleDateString("en-GB");
  const fromBlockHtml = buildInstitutionFromBlockHtml();
  const toBlockHtml = buildInstitutionToBlockHtml(application);
  const studentRows = buildInstitutionStudentRowsForEmail(students);
  const institutionInfo = escapeHtml(String(application?.authority_name || "-").trim() || "-");

  return `
    <div style="font-family:Times New Roman, serif;color:#111;line-height:1.5;max-width:760px;">
      <p style="margin:0 0 10px 0;">SLS/1/HOD/${submittedDate.getFullYear()}</p>
      <p style="margin:0 0 16px 0;">${escapeHtml(dateDisplay)}</p>
      <p style="margin:0 0 4px 0;"><strong>From,</strong></p>
      <p style="margin:0 0 12px 0;">${fromBlockHtml}</p>
      <p style="margin:0 0 4px 0;"><strong>To,</strong></p>
      <p style="margin:0 0 14px 0;">${toBlockHtml}</p>
      <p style="margin:0 0 10px 0;"><strong>Subject: Request for Permission for Internship Opportunities for Students</strong></p>
      <p style="margin:0 0 10px 0;">Respected Sir/Madam,</p>
      <p style="margin:0 0 10px 0;">
        I hope this letter finds you well. I am writing to request permission for the following students
        of School of Legal Studies, Kannur University to undertake 14 days internship at Office Of ${institutionInfo}
        as part of their academic curriculum.
      </p>
      ${
        studentRows
          ? `<table style="border-collapse:collapse;width:100%;margin:8px 0 14px 0;font-size:14px;">
              <thead>
                <tr style="background:#f3f5fb;">
                  <th style="border:1px solid #6b7280;padding:8px;text-align:left;">#</th>
                  <th style="border:1px solid #6b7280;padding:8px;text-align:left;">Name</th>
                  <th style="border:1px solid #6b7280;padding:8px;text-align:left;">Admission No</th>
                  <th style="border:1px solid #6b7280;padding:8px;text-align:left;">Semester</th>
                  <th style="border:1px solid #6b7280;padding:8px;text-align:left;">Batch year</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows}
              </tbody>
            </table>`
          : ""
      }
      <p style="margin:0 0 8px 0;">We assure you that the students will strictly adhere to all rules and regulations of the facility and will maintain the highest level of professionalism and discipline.</p>
      <p style="margin:0 0 8px 0;">We kindly request you to grant permission for the internship and provide us with the necessary guidelines and requirements for participation. We would be grateful for your cooperation and support in this academic endeavor.</p>
      <p style="margin:0 0 8px 0;">For any further discussions, please feel free to contact us at hodlegal@kannuruniv.ac.in or 8547889278.</p>
      <p style="margin:0 0 2px 0;">Thank you for your time and consideration.</p>
      <p style="margin:14px 0 0 0;">Yours sincerely,<br/>HEAD OF THE DEPARTMENT</p>
    </div>
  `;
};

const replaceRawPlaceholder = (html, key, value) =>
  html.replaceAll(`{{${key}}}`, value);

const renderHtmlTemplate = (template, application, signatureDataUri) => {
  const students = parseStudents(application.students);
  const firstStudent = students[0] || {};
  const submittedDate = new Date(application.created_at);
  const year = String(submittedDate.getFullYear());
  const dateDisplay = submittedDate.toLocaleDateString("en-GB");
  const batchYear = Number(firstStudent.batch);
  const duration =
    Number.isInteger(batchYear) && batchYear >= 2015 && batchYear <= 2050
      ? `${batchYear}-${batchYear + 5}`
      : "-";

  const studentRows =
    students.length > 0
      ? students
          .map(
            (student, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${student.studentName || "-"}</td>
                <td>${student.admissionNumber || "-"}</td>
                <td>${student.semester || "-"}</td>
                <td>${student.batch || "-"}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="5">No student records available.</td></tr>`;

  const replacements = {
    "{{APPLICATION_ID}}": String(application.id),
    "{{SUBMITTED_AT}}": new Date(application.created_at).toISOString(),
    "{{STUDENT_ROWS}}": studentRows,
    "{{AUTHORITY_REQUEST}}": application.needs_authority_request ? "Yes" : "No",
    "{{AUTHORITY_NAME}}": application.authority_name || "-",
    "{{AUTHORITY_PLACE}}": application.authority_place || "-",
    "{{AUTHORITY_EMAIL}}": application.authority_email || "-",
    "{{SEND_AS_EMAIL}}": application.send_as_email ? "Yes" : "No",
    "{{Date}}": dateDisplay,
    "{{Name}}": firstStudent.studentName || "-",
    "{{sem}}": firstStudent.semester || "-",
    "{{admissionnumber}}": firstStudent.admissionNumber || "-",
    "{{duration}}": duration,
    "{{Year}}": year,
    "{{institution_info}}": application.authority_name || "-",
  };

  let html = Object.entries(replacements).reduce(
    (output, [key, value]) => output.replaceAll(key, value),
    template
  );

  // Ref line: "Year" is split across spans and/or separated by </span> from "HOD/".
  // A pattern like SLS/1/HOD/{{...ar}} does NOT match the real HTML (HOD/ ends a span first).
  // Do this before institution body replace.
  // Institution template: SLS/1/HOD/</span><span...>{{</span>...Y...e...ar}}
  html = html.replace(
    /<span[^>]*>SLS\/1\/HOD\/<\/span><span[^>]*>\{\{<\/span><span[^>]*>Y<\/span><span[^>]*>e<\/span><span[^>]*>ar\}\}[^<]*<\/span>/gi,
    `<span class="pdf24_17 pdf24_11 pdf24_20">SLS/1/HOD/${year} &nbsp;</span>`
  );
  // Internship template: SLS/1/H.O.D/{{ in same span, then Y / e / ar}} in following spans
  html = html.replace(
    /<span[^>]*>SLS\/1\/H\.O\.D\/\{\{<\/span><span[^>]*>Y<\/span><span[^>]*>e<\/span><span[^>]*>ar\}\}[^<]*<\/span>/gi,
    `<span class="pdf24_19 pdf24_20 pdf24_21">SLS/1/H.O.D/${year} &nbsp;</span>`
  );
  // Any literal {{Year}} left in a template
  html = html.replaceAll("{{Year}}", year);

  // Institution name in letter body: anchor to "at Office Of " so we never cross-match
  // the Year placeholder above.
  const institutionNameHtml = escapeHtml(String(application.authority_name || "-").trim() || "-");
  html = html.replace(
    /at Office Of \{\{[\s\S]*?institution_info\}\}/i,
    `at Office Of ${institutionNameHtml}`
  );

  const fromBlockHtml = buildInstitutionFromBlockHtml();
  const toBlockHtml = buildInstitutionToBlockHtml(application);
  const studentDetailsBlockHtml = buildInstitutionStudentDetailsBlockHtml(students);
  html = replaceRawPlaceholder(html, "from_block", fromBlockHtml);
  html = replaceRawPlaceholder(html, "to_block", toBlockHtml);
  html = replaceRawPlaceholder(html, "student_details_block", studentDetailsBlockHtml);

  if (application.is_approved && signatureDataUri) {
    const signatureBlock = `
      <div class="signature-overlay">
        <img src="${signatureDataUri}" alt="HOD Signature" />
      </div>
    `;
    html = html.replace(
      '<div class="pdf24_05 pdf24_06">',
      `<div class="pdf24_05 pdf24_06">${signatureBlock}`
    );
  }

  return html;
};

const injectPrintOverrides = (html) => {
  const printCss = `
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Remove "card" shadow/border on the root page wrapper (often prints as a grey rule) */
      body > div {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        outline: none !important;
      }
      .pdf24_view {
        font-size: 1em !important;
        transform: scale(1) !important;
        -webkit-transform: scale(1) !important;
        -moz-transform: scale(1) !important;
        transform-origin: top left !important;
        -webkit-transform-origin: top left !important;
        -moz-transform-origin: top left !important;
      }
      .pdf24_02 {
        page-break-after: always;
        break-after: page;
      }
      .pdf24_02:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .signature-overlay {
        position: absolute;
        left: 35.2em;
        /* Clear body text at ~55.6em; top edge of image was reading as a horizontal rule */
        top: 56.15em;
        width: 12em;
        height: 3.2em;
        z-index: 700;
      }
      .signature-overlay img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      /* Hide baked-in template image layer (it contains old logo/background artifacts). */
      .pdf24_03 > img.pdf24_04 {
        display: none !important;
      }
      .pdf-logo-overlay {
        position: absolute;
        z-index: 860;
        pointer-events: none;
      }
      .pdf-logo-overlay img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .inst-student-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 0.56em;
        line-height: 1.25;
        color: #1a1a1a;
        border: 1px solid #6b7280;
      }
      .inst-student-table th,
      .inst-student-table td {
        border: 1px solid #6b7280 !important;
        padding: 0.35em 0.3em;
        vertical-align: top;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .inst-student-table th {
        background: #f3f5fb;
        font-weight: 700;
        text-align: left;
      }
      /* institution-template uses .pdf24_01 { white-space: nowrap; } for absolutely positioned
         text blocks. Injected From/To/body content must be allowed to wrap for PDF rendering. */
      .institution-field {
        position: absolute;
        z-index: 5;
        white-space: normal !important;
        overflow: visible !important;
        line-height: 1.25 !important;
        color: #1a1a1a;
      }
      .institution-field a {
        color: inherit;
        text-decoration: none;
      }
    </style>
  `;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${printCss}</head>`);
  }
  return `${printCss}${html}`;
};

const getSignatureDataUri = async () => {
  try {
    const signatureFile = await readFile(SIGNATURE_PATH);
    return `data:image/svg+xml;base64,${signatureFile.toString("base64")}`;
  } catch {
    return null;
  }
};

/** Same logo as the site header (`/logo.png`); embedded so Puppeteer `setContent` can render it. */
const getLogoDataUri = async () => {
  try {
    const buf = await readFile(LOGO_PATH);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
};

const injectHeaderLogoOverlay = (html, logoDataUri, needsAuthorityRequest) => {
  if (!logoDataUri) {
    return html;
  }
  const logoStyle = needsAuthorityRequest
    ? 'left:22em;top:0.9em;width:5em;height:5em;'
    : 'left:22.1em;top:7.2em;width:4.4em;height:4.4em;';
  const logoBlock = `
      <div class="pdf-logo-overlay" style="${logoStyle}">
        <img src="${logoDataUri}" alt="University Logo" />
      </div>
  `;
  return html.replace(
    '<div class="pdf24_05 pdf24_06">',
    `<div class="pdf24_05 pdf24_06">${logoBlock}`
  );
};

const generateFallbackPdf = async (application) => {
  const students = parseStudents(application.students);
  const firstStudent = students[0] || {};
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const line = (text, isBold = false) => {
    page.drawText(text, {
      x: 50,
      y,
      size: 12,
      font: isBold ? bold : regular,
    });
    y -= 18;
  };

  line("Internship Application", true);
  y -= 4;
  line(`Application ID: ${application.id}`);
  line(`Submitted At: ${new Date(application.created_at).toISOString()}`);
  y -= 8;

  line("First Student", true);
  line(`Name: ${firstStudent.studentName || "-"}`);
  line(`Admission Number: ${firstStudent.admissionNumber || "-"}`);
  line(`Semester: ${firstStudent.semester || "-"}`);
  line(`Batch Year: ${firstStudent.batch || "-"}`);
  y -= 8;

  line("Authority Details", true);
  line(
    `Authority Request: ${
      application.needs_authority_request ? "Yes" : "No"
    }`
  );
  line(`Name / Office Name: ${application.authority_name || "-"}`);
  line(`Place: ${application.authority_place || "-"}`);
  line(`Send as Email: ${application.send_as_email ? "Yes" : "No"}`);

  return Buffer.from(await pdfDoc.save());
};

const launchBrowser = async () => {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.executablePath();

    return puppeteerCore.default.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

export const generateApplicationPdfBuffer = async (application) => {
  const templatePath = application?.needs_authority_request
    ? INSTITUTION_TEMPLATE_PATH
    : DEFAULT_TEMPLATE_PATH;
  const templateRaw = await readFile(templatePath, "utf-8");
  const [signatureDataUri, logoDataUri] = await Promise.all([
    getSignatureDataUri(),
    getLogoDataUri(),
  ]);
  const template = injectHeaderLogoOverlay(
    templateRaw,
    logoDataUri,
    Boolean(application?.needs_authority_request)
  );
  const html = injectPrintOverrides(
    renderHtmlTemplate(template, application, signatureDataUri)
  );

  let browser;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 30000,
    });
    await page.emulateMediaType("print");
    const pdfBuffer = await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
    return { buffer: Buffer.from(pdfBuffer), mode: "template" };
  } catch (error) {
    const errorMessage = String(error?.message || "Unknown PDF render error");
    console.error("Primary PDF rendering failed:", error);

    if (process.env.NODE_ENV === "development") {
      return { buffer: await generateFallbackPdf(application), mode: "fallback" };
    }

    throw new Error(`Template PDF rendering failed: ${errorMessage}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

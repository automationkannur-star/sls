import path from "path";
import { readFile } from "fs/promises";
import puppeteer from "puppeteer";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";

const parseStudents = (students) => {
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

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "templates",
  "internship-template.html"
);
const SIGNATURE_PATH = path.join(
  process.cwd(),
  "src",
  "templates",
  "assets",
  "hod-signature-dummy.svg"
);

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
                <td>${student.email || "-"}</td>
                <td>${student.admissionNumber || "-"}</td>
                <td>${student.semester || "-"}</td>
                <td>${student.batch || "-"}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="6">No student records available.</td></tr>`;

  const replacements = {
    // Existing generic placeholders
    "{{APPLICATION_ID}}": String(application.id),
    "{{SUBMITTED_AT}}": new Date(application.created_at).toISOString(),
    "{{STUDENT_ROWS}}": studentRows,
    "{{AUTHORITY_REQUEST}}": application.needs_authority_request ? "Yes" : "No",
    "{{AUTHORITY_NAME}}": application.authority_name || "-",
    "{{AUTHORITY_PLACE}}": application.authority_place || "-",
    "{{AUTHORITY_EMAIL}}": application.authority_email || "-",
    "{{SEND_AS_EMAIL}}": application.send_as_email ? "Yes" : "No",
    // Converted PPT-style placeholders
    "{{Date}}": dateDisplay,
    "{{Name}}": firstStudent.studentName || "-",
    "{{sem}}": firstStudent.semester || "-",
    "{{admissionnumber}}": firstStudent.admissionNumber || "-",
    "{{duration}}": duration,
    "{{Year}}": year,
  };

  let html = Object.entries(replacements).reduce(
    (html, [key, value]) => html.replaceAll(key, value),
    template
  );

  // Some converted PPT HTML splits "{{Year}}" across spans, so replace that block by regex.
  html = html.replace(
    /SLS\/1\/H\.O\.D\/\{\{[\s\S]*?ar\}\}/gi,
    `SLS/1/H.O.D/${year}`
  );

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
      body > div {
        margin: 0 !important;
        box-shadow: none !important;
      }
      .pdf24_02 {
        page-break-after: always;
        break-after: page;
      }
      .pdf24_02:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .signature-overlay {
        position: absolute;
        left: 35.2em;
        top: 55.8em;
        width: 12em;
        height: 3.2em;
        z-index: 700;
      }
      .signature-overlay img {
        width: 100%;
        height: 100%;
        object-fit: contain;
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

const generateApplicationPdf = async (application) => {
  const template = await readFile(TEMPLATE_PATH, "utf-8");
  const signatureDataUri = await getSignatureDataUri();
  const html = injectPrintOverrides(
    renderHtmlTemplate(template, application, signatureDataUri)
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
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
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};

export async function GET(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid application id." }, { status: 400 });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          students,
          needs_authority_request,
          authority_name,
          authority_place,
          authority_email,
          send_as_email,
          is_approved,
          created_at
        FROM internship_applications
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    const application = result.rows[0];
    if (!application) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }
    const pdfBuffer = await generateApplicationPdf(application);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Generate application PDF failed:", error);
    if (String(error?.message || "").includes("ENOENT")) {
      return NextResponse.json(
        {
          message:
            "HTML template not found. Place it at src/templates/internship-template.html",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "Unable to generate PDF." },
      { status: 500 }
    );
  }
}

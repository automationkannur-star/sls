import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { buildInstitutionEmailBodyHtml, parseStudents } from "@/lib/applicationPdf";
import { sendApplicationEmailToAuthority } from "@/lib/mailer";

export async function POST(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid application id." }, { status: 400 });
    }

    const result = await pool.query(
      `
        SELECT
          id,
          students,
          authority_name,
          authority_place,
          authority_email,
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

    const authorityEmail = String(application.authority_email || "").trim();
    if (!authorityEmail) {
      return NextResponse.json(
        { message: "No authority email found for this application." },
        { status: 400 }
      );
    }

    const students = parseStudents(application.students);
    const emailHtml = buildInstitutionEmailBodyHtml(application);
    const emailText = [
      `SLS/1/HOD/${new Date(application.created_at || Date.now()).getFullYear()}`,
      `Date: ${new Date(application.created_at || Date.now()).toLocaleDateString("en-GB")}`,
      "",
      "Subject: Request for Permission for Internship Opportunities for Students",
      "",
      "Respected Sir/Madam,",
      "I am writing to request permission for internship opportunities for the listed students of School of Legal Studies, Kannur University.",
      "Please refer to the HTML email version for full formatted details.",
      "",
      "Thank you.",
      "HEAD OF THE DEPARTMENT",
    ].join("\n");

    await sendApplicationEmailToAuthority({
      authorityEmail,
      authorityName: application.authority_name,
      authorityPlace: application.authority_place,
      applicationId: application.id,
      studentName: students[0]?.studentName || "",
      emailText,
      emailHtml,
    });

    return NextResponse.json(
      {
        message: "Email sent to authority successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send authority email failed:", error);
    return NextResponse.json(
      { message: `Unable to send authority email. ${String(error?.message || "")}` },
      { status: 500 }
    );
  }
}

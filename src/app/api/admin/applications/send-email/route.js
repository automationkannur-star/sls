import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { generateApplicationPdfBuffer, parseStudents } from "@/lib/applicationPdf";
import { sendApplicationApprovedEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const students = parseStudents(application.students);
    const recipients = [
      ...new Set(
        students
          .map((student) => String(student?.email || "").trim())
          .filter(Boolean)
      ),
    ];

    if (recipients.length === 0) {
      return NextResponse.json(
        { message: "No valid student email IDs found for this application." },
        { status: 400 }
      );
    }

    const { buffer } = await generateApplicationPdfBuffer(application);
    const emailInfo = await sendApplicationApprovedEmail({
      recipients,
      studentName: students[0]?.studentName || "student",
      applicationId: application.id,
      pdfBuffer: buffer,
    });

    return NextResponse.json(
      {
        message: `Email sent to ${emailInfo.count} student(s).`,
        emailSent: emailInfo.sent,
        emailsSentCount: emailInfo.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send application email failed:", error);
    return NextResponse.json(
      { message: `Unable to send email. ${String(error?.message || "")}` },
      { status: 500 }
    );
  }
}

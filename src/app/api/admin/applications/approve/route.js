import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { generateApplicationPdfBuffer, parseStudents } from "@/lib/applicationPdf";
import { sendApplicationApprovedEmail } from "@/lib/mailer";

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

    const adminId = Number(session.sub);
    const approvedBy = Number.isInteger(adminId) && adminId > 0 ? adminId : null;

    const result = await pool.query(
      `
        UPDATE internship_applications
        SET
          is_approved = TRUE,
          approved_at = NOW(),
          approved_by = COALESCE(approved_by, $2)
        WHERE id = $1
        RETURNING
          id,
          is_approved,
          approved_at,
          students,
          needs_authority_request,
          authority_name,
          authority_place,
          authority_email,
          send_as_email,
          institution,
          created_at
      `,
      [id, approvedBy]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    const application = result.rows[0];
    const students = parseStudents(application.students);
    const recipients = [
      ...new Set(
        students
          .map((student) => String(student?.email || "").trim())
          .filter(Boolean)
      ),
    ];

    let emailInfo = { sent: false, count: 0 };
    if (recipients.length > 0) {
      try {
        const { buffer } = await generateApplicationPdfBuffer({
          ...application,
          is_approved: true,
        });
        emailInfo = await sendApplicationApprovedEmail({
          recipients,
          studentName: students[0]?.studentName || "student",
          applicationId: application.id,
          pdfBuffer: buffer,
          institution: application.institution,
        });
      } catch (mailError) {
        console.error("Approve email sending failed:", mailError);
      }
    }

    return NextResponse.json(
      {
        message: emailInfo.sent
          ? `Application approved and email sent to ${emailInfo.count} student(s).`
          : "Application approved.",
        id: application.id,
        isApproved: application.is_approved,
        approvedAt: application.approved_at,
        emailSent: emailInfo.sent,
        emailsSentCount: emailInfo.count,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Approve application failed:", error);
    return NextResponse.json(
      { message: "Unable to approve application." },
      { status: 500 }
    );
  }
}

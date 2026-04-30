import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { sendStudentRequestReplyEmail } from "@/lib/mailer";

const MAX_FILE_COUNT = 2;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const ALLOWED_FILE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const id = Number(formData.get("id"));
    const replyMessage = String(formData.get("replyMessage") || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Invalid request id." }, { status: 400 });
    }
    if (!replyMessage) {
      return NextResponse.json({ message: "Reply message is required." }, { status: 400 });
    }

    const result = await pool.query(
      `
        SELECT id, student_name, email
        FROM service_requests
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const studentRequest = result.rows[0];
    if (!studentRequest) {
      return NextResponse.json({ message: "Student request not found." }, { status: 404 });
    }

    const rawAttachments = formData
      .getAll("attachments")
      .filter((value) => typeof value === "object" && value !== null && "name" in value);
    if (rawAttachments.length > MAX_FILE_COUNT) {
      return NextResponse.json(
        { message: "You can attach a maximum of 2 files." },
        { status: 400 }
      );
    }

    const attachments = [];
    for (const file of rawAttachments) {
      const fileName = String(file.name || "").trim();
      if (!fileName || file.size <= 0) {
        continue;
      }
      if (!ALLOWED_FILE_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { message: "Only PDF, PNG, and JPEG files are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { message: "Each attachment must be under 1 MB." },
          { status: 400 }
        );
      }
      const bytes = await file.arrayBuffer();
      attachments.push({
        filename: fileName,
        content: Buffer.from(bytes),
        contentType: file.type,
      });
    }

    await sendStudentRequestReplyEmail({
      toEmail: studentRequest.email,
      studentName: studentRequest.student_name,
      requestId: studentRequest.id,
      replyMessage,
      attachments,
    });

    await pool.query(
      `
        UPDATE service_requests
        SET
          reply_message = $2,
          updated_at = NOW()
        WHERE id = $1
      `,
      [id, replyMessage]
    );

    return NextResponse.json(
      { message: "Reply sent to student successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send student request reply failed:", error);
    return NextResponse.json(
      { message: `Unable to send reply. ${String(error?.message || "")}` },
      { status: 500 }
    );
  }
}

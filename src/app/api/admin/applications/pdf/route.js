import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import { generateApplicationPdfBuffer } from "@/lib/applicationPdf";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const { buffer: pdfBuffer, mode } = await generateApplicationPdfBuffer(application);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application-${id}.pdf"`,
        "Cache-Control": "no-store",
        "x-pdf-mode": mode,
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
      { message: `Unable to generate PDF. ${String(error?.message || "")}` },
      { status: 500 }
    );
  }
}

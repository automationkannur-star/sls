import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";

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
        RETURNING id, is_approved, approved_at
      `,
      [id, approvedBy]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Application approved.",
        id: result.rows[0].id,
        isApproved: result.rows[0].is_approved,
        approvedAt: result.rows[0].approved_at,
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

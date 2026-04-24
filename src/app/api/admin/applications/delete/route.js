import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ message: "No valid application IDs provided." }, { status: 400 });
    }

    const result = await pool.query(
      `
        DELETE FROM internship_applications
        WHERE id = ANY($1::int[])
        RETURNING id
      `,
      [ids]
    );

    return NextResponse.json(
      {
        message: `${result.rowCount} application(s) deleted successfully.`,
        deletedIds: result.rows.map((row) => row.id),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete applications failed:", error);
    return NextResponse.json({ message: "Unable to delete applications." }, { status: 500 });
  }
}

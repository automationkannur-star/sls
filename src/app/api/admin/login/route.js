import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/adminAuth";

const UNAUTHORIZED_MESSAGE = "Invalid username or password.";

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    if (!username || !password || username.length > 100 || password.length > 200) {
      return NextResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const result = await pool.query(
      `
        SELECT id, username, password_hash
        FROM admin_users
        WHERE username = $1 AND is_active = TRUE
        LIMIT 1
      `,
      [username]
    );

    const adminUser = result.rows[0];
    if (!adminUser) {
      return NextResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, adminUser.password_hash);
    if (!passwordMatches) {
      return NextResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 });
    }

    const token = await createAdminSessionToken({
      sub: String(adminUser.id),
      username: adminUser.username,
      role: "admin",
    });
    await setAdminSessionCookie(token);

    return NextResponse.json({ message: "Login successful." }, { status: 200 });
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json({ message: "Unable to login." }, { status: 500 });
  }
}

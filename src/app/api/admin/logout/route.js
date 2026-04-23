import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/adminAuth";

export async function POST() {
  await clearAdminSessionCookie();
  return NextResponse.json({ message: "Logout successful." }, { status: 200 });
}

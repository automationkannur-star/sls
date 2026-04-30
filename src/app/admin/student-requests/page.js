import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import LogoutButton from "../dashboard/logout-button";
import StudentRequestsTable from "./student-requests-table";

export default async function AdminStudentRequestsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin");
  }

  const result = await pool.query(
    `
      SELECT
        id,
        student_name,
        email,
        mobile_number,
        admission_number,
        course,
        semester,
        batch,
        request_subject,
        message,
        priority,
        status,
        uploaded_file_urls,
        created_at
      FROM service_requests
      ORDER BY created_at DESC
      LIMIT 500
    `
  );

  const studentRequests = result.rows.map((row) => ({
    ...row,
    created_at_display: new Date(row.created_at).toISOString(),
  }));

  return (
    <>
      <header className="adminTopHeader border-bottom bg-light">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <div>
            <h1 className="h5 mb-0">Admin Dashboard</h1>
            <p className="text-muted small mb-0">Manage student requests</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link href="/admin/dashboard" className="btn btn-outline-secondary btn-sm">
              Internship Requests
            </Link>
            <Link href="/admin/student-requests" className="btn btn-primary btn-sm">
              Student Requests
            </Link>
            <LogoutButton username={session.username} />
          </div>
        </div>
      </header>

      <div className="container py-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h5 mb-3">Student Requests</h2>
            <StudentRequestsTable studentRequests={studentRequests} />
          </div>
        </div>
      </div>
    </>
  );
}

import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/adminAuth";
import { pool } from "@/lib/db";
import LogoutButton from "./logout-button";
import ApplicationsTable from "./applications-table";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin");
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
        created_at,
        is_approved,
        approved_at
      FROM internship_applications
      ORDER BY created_at ASC
      LIMIT 500
    `
  );
  const applications = result.rows.map((row) => ({
    ...row,
    created_at_display: new Date(row.created_at).toISOString(),
  }));

  return (
    <>
      <header className="adminTopHeader border-bottom bg-light">
        <div className="container d-flex align-items-center justify-content-between py-2">
          <div>
            <h1 className="h5 mb-0">Admin Dashboard</h1>
            <p className="text-muted small mb-0">Manage internship applications</p>
          </div>
          <LogoutButton username={session.username} />
        </div>
      </header>

      <div className="container py-4">

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h5 mb-3">Internship Applications</h2>
            <ApplicationsTable applications={applications} />
          </div>
        </div>
      </div>
    </>
  );
}

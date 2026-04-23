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
      ORDER BY created_at DESC
      LIMIT 100
    `
  );
  const applications = result.rows.map((row) => ({
    ...row,
    created_at_display: new Date(row.created_at).toISOString(),
  }));

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Admin Dashboard</h1>
          <p className="text-muted mb-0">Welcome, {session.username}</p>
        </div>
        <LogoutButton />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Internship Applications</h2>
          {result.rows.length === 0 ? (
            <p className="text-muted mb-0">No applications found.</p>
          ) : (
            <ApplicationsTable applications={applications} />
          )}
        </div>
      </div>
    </div>
  );
}

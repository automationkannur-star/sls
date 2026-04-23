"use client";

import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

const parseStudents = (students) => {
  if (Array.isArray(students)) {
    return students;
  }

  if (typeof students === "string") {
    try {
      const parsedValue = JSON.parse(students);
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      return [];
    }
  }

  return [];
};

export default function ApplicationsTable({ applications }) {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [approvedIds, setApprovedIds] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [actionMessage, setActionMessage] = useState({
    type: "",
    text: "",
  });

  const normalizedApplications = useMemo(() => {
    return applications.map((application) => ({
      ...application,
      students: parseStudents(application.students),
    }));
  }, [applications]);

  const approveApplication = async (applicationId) => {
    const response = await fetch("/api/admin/applications/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: applicationId }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Unable to approve application.");
    }

    return result;
  };

  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>First Student Name</th>
              <th>Total Students</th>
              <th>Authority Request</th>
              <th>Approval</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {normalizedApplications.map((application) => {
              const firstStudentName = application.students[0]?.studentName || "-";
              const isApproved = Boolean(application.is_approved || approvedIds[application.id]);
              return (
                <tr key={application.id}>
                  <td>{application.id}</td>
                  <td>{firstStudentName}</td>
                  <td>{application.students.length}</td>
                  <td>{application.needs_authority_request ? "Yes" : "No"}</td>
                  <td>{isApproved ? "Approved" : "Pending"}</td>
                  <td>{application.created_at_display || "-"}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        onClick={() => {
                          setActionMessage({ type: "", text: "" });
                          setSelectedApplication(application);
                        }}
                      >
                        View
                      </button>
                      {!isApproved && (
                        <button
                          className="btn btn-sm btn-success"
                          type="button"
                          disabled={approvingId === application.id}
                          onClick={async () => {
                            setApprovingId(application.id);
                            setActionMessage({ type: "", text: "" });

                            try {
                              const result = await approveApplication(application.id);
                              setApprovedIds((prev) => ({
                                ...prev,
                                [application.id]: true,
                              }));
                              if (selectedApplication?.id === application.id) {
                                setSelectedApplication((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        is_approved: true,
                                        approved_at: result.approvedAt || prev.approved_at,
                                      }
                                    : prev
                                );
                                setActionMessage({
                                  type: "success",
                                  text: "Application approved. You can now download the PDF.",
                                });
                              }
                            } catch (error) {
                              if (selectedApplication?.id === application.id) {
                                setActionMessage({
                                  type: "error",
                                  text: error.message,
                                });
                              }
                            } finally {
                              setApprovingId(null);
                            }
                          }}
                        >
                          {approvingId === application.id ? "Approving..." : "Approve"}
                        </button>
                      )}
                      <a
                        className="btn btn-sm btn-primary"
                        href={`/api/admin/applications/pdf?id=${application.id}`}
                      >
                        Download PDF
                      </a>
                      <button className="btn btn-sm btn-warning" type="button">
                        Send as email
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        show={Boolean(selectedApplication)}
        onHide={() => setSelectedApplication(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Application #{selectedApplication?.id || ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionMessage.text && (
            <div
              className={`alert ${
                actionMessage.type === "success" ? "alert-success" : "alert-danger"
              } py-2 mb-3 text-break`}
              role="alert"
              style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {actionMessage.text}
            </div>
          )}

          <h5 className="mb-3">Student Details</h5>
          {selectedApplication?.students?.length ? (
            <div className="table-responsive mb-4">
              <table className="table table-bordered table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Admission Number</th>
                    <th>Semester</th>
                    <th>Batch year</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedApplication.students.map((student, index) => (
                    <tr key={`${selectedApplication.id}-student-${index + 1}`}>
                      <td>{index + 1}</td>
                      <td>{student.studentName || "-"}</td>
                      <td>{student.email || "-"}</td>
                      <td>{student.admissionNumber || "-"}</td>
                      <td>{student.semester || "-"}</td>
                      <td>{student.batch || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted">No student details available.</p>
          )}

          <h5 className="mb-3">Applying Authority Details</h5>
          <dl className="row mb-0">
            <dt className="col-sm-4">Authority Request</dt>
            <dd className="col-sm-8">
              {selectedApplication?.needs_authority_request ? "Yes" : "No"}
            </dd>

            <dt className="col-sm-4">Name / Office Name</dt>
            <dd className="col-sm-8">{selectedApplication?.authority_name || "-"}</dd>

            <dt className="col-sm-4">Place</dt>
            <dd className="col-sm-8">{selectedApplication?.authority_place || "-"}</dd>

            <dt className="col-sm-4">Authority Email</dt>
            <dd className="col-sm-8">{selectedApplication?.authority_email || "-"}</dd>

            <dt className="col-sm-4">Send as Email</dt>
            <dd className="col-sm-8">{selectedApplication?.send_as_email ? "Yes" : "No"}</dd>
          </dl>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-wrap gap-2">
          <Button
            variant="success"
            disabled={
              !selectedApplication ||
              isApproving ||
              selectedApplication?.is_approved ||
              approvedIds[selectedApplication?.id]
            }
            onClick={async () => {
              if (!selectedApplication) {
                return;
              }

              setIsApproving(true);
              setActionMessage({ type: "", text: "" });

              try {
                const result = await approveApplication(selectedApplication.id);

                setSelectedApplication((prev) =>
                  prev
                    ? {
                        ...prev,
                        is_approved: true,
                        approved_at: result.approvedAt || prev.approved_at,
                      }
                    : prev
                );
                setApprovedIds((prev) => ({
                  ...prev,
                  [selectedApplication.id]: true,
                }));
                setActionMessage({
                  type: "success",
                  text: "Application approved. You can now download the PDF.",
                });
              } catch (error) {
                setActionMessage({
                  type: "error",
                  text: error.message,
                });
              } finally {
                setIsApproving(false);
              }
            }}
          >
            {selectedApplication?.is_approved || approvedIds[selectedApplication?.id]
              ? "Approved"
              : isApproving
                ? "Approving..."
                : "Approve"}
          </Button>
          {selectedApplication && (
            <a
              className="btn btn-primary"
              href={`/api/admin/applications/pdf?id=${selectedApplication.id}`}
            >
              Download PDF
            </a>
          )}
          <Button variant="secondary" onClick={() => setSelectedApplication(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Toast from "react-bootstrap/Toast";
import ToastContainer from "react-bootstrap/ToastContainer";

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

const parseResponseJson = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export default function ApplicationsTable({ applications }) {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [approvedIds, setApprovedIds] = useState({});
  const [isApproving, setIsApproving] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [sendingAuthorityEmailId, setSendingAuthorityEmailId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionMessage, setActionMessage] = useState({
    type: "",
    text: "",
  });
  const [toast, setToast] = useState({
    show: false,
    variant: "success",
    title: "",
    message: "",
  });
  const toastTimerRef = useRef(null);

  const showToast = (variant, title, message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({
      show: true,
      variant,
      title,
      message,
    });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    },
    []
  );

  const normalizedApplications = useMemo(() => {
    return applications.map((application) => ({
      ...application,
      students: parseStudents(application.students),
    }));
  }, [applications]);

  const visibleApplications = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return normalizedApplications
      .filter((application) => {
        const isApproved = Boolean(
          application.is_approved || approvedIds[application.id]
        );

        if (statusFilter === "pending" && isApproved) {
          return false;
        }
        if (statusFilter === "approved" && !isApproved) {
          return false;
        }

        const createdDate = new Date(application.created_at);
        if (fromDate) {
          const from = new Date(`${fromDate}T00:00:00`);
          if (createdDate < from) {
            return false;
          }
        }
        if (toDate) {
          const to = new Date(`${toDate}T23:59:59.999`);
          if (createdDate > to) {
            return false;
          }
        }

        if (!query) {
          return true;
        }

        const firstStudentName = application.students[0]?.studentName || "";
        const admissionNumbers = application.students
          .map((student) => String(student?.admissionNumber || "").trim())
          .filter(Boolean)
          .join(" ");

        const haystack = [
          String(application.id),
          firstStudentName,
          application.authority_name || "",
          application.authority_email || "",
          admissionNumbers,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return a.id - b.id;
      });
  }, [normalizedApplications, approvedIds, statusFilter, fromDate, toDate, searchText]);

  const approveApplication = async (applicationId) => {
    const response = await fetch("/api/admin/applications/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: applicationId }),
    });

    const result = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Unable to approve application.");
    }

    return result;
  };

  const sendApplicationEmail = async (applicationId) => {
    const response = await fetch("/api/admin/applications/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: applicationId }),
    });

    const result = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Unable to send email.");
    }

    return result;
  };

  const sendAuthorityEmail = async (applicationId) => {
    const response = await fetch("/api/admin/applications/send-authority-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: applicationId }),
    });

    const result = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(result.message || "Unable to send authority email.");
    }

    return result;
  };

  return (
    <>
      <ToastContainer
        position="top-end"
        className="p-3 adminToastContainer"
        style={{ zIndex: 1200 }}
      >
        <Toast
          show={toast.show}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
          delay={5000}
          autohide
          bg={toast.variant === "danger" ? "danger" : "success"}
          className="adminToast"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">{toast.title || "Notice"}</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
      <div className="card border-0 shadow-sm mb-3 filterCard">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-12 col-md-5">
          <input
            className="form-control shadow-none filterInput"
            type="text"
            placeholder="Search by ID, student name, admission no, authority"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
            </div>
            <div className="col-6 col-md-2">
          <select
            className="form-select shadow-none filterInput"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="all">All</option>
          </select>
            </div>
            <div className="col-6 col-md-2">
          <input
            className="form-control shadow-none filterInput"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            title="From date"
          />
            </div>
            <div className="col-6 col-md-2">
          <input
            className="form-control shadow-none filterInput"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            title="To date"
          />
            </div>
            <div className="col-6 col-md-1 d-grid">
          <button
            className="btn btn-outline-secondary clearBtn"
            type="button"
            onClick={() => {
              setSearchText("");
              setStatusFilter("pending");
              setFromDate("");
              setToDate("");
            }}
          >
            Clear
          </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted fw-medium">
          Showing {visibleApplications.length} application(s) in FIFO order.
        </small>
      </div>

      <div className="table-responsive rounded-3 border shadow-sm overflow-hidden">
        <table className="table table-sm align-middle mb-0 adminTable">
          <thead className="tableHead">
            <tr>
              <th>ID</th>
              <th>First Student Name</th>
              <th>Total Students</th>
              <th>Authority Request</th>
              <th>Send as email</th>
              <th>Approval</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleApplications.map((application) => {
              const firstStudentName = application.students[0]?.studentName || "-";
              const isApproved = Boolean(application.is_approved || approvedIds[application.id]);
              return (
                <tr key={application.id} className="tableRow">
                  <td className="fw-semibold text-primary-emphasis">#{application.id}</td>
                  <td className="fw-medium">{firstStudentName}</td>
                  <td>{application.students.length}</td>
                  <td>
                    <span
                      className={`badge rounded-pill ${
                        application.needs_authority_request
                          ? "text-bg-info"
                          : "text-bg-secondary"
                      }`}
                    >
                      {application.needs_authority_request ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill ${
                        application.send_as_email ? "text-bg-primary" : "text-bg-light text-dark border"
                      }`}
                    >
                      {application.send_as_email ? "Yes" : "No"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill ${
                        isApproved ? "text-bg-success" : "text-bg-warning"
                      }`}
                    >
                      {isApproved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td>
                    {application.created_at
                      ? new Date(application.created_at).toLocaleString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2 actionWrap">
                      <button
                        className="btn btn-sm btn-outline-primary actionBtn"
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
                          className="btn btn-sm btn-success actionBtn"
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
                              const successText =
                                result?.message ||
                                "Application approved. You can now download the PDF.";
                              showToast("success", "Approved", successText);
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
                              showToast(
                                "danger",
                                "Approval failed",
                                error.message || "Unable to approve application."
                              );
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
                        className="btn btn-sm btn-primary actionBtn"
                        href={`/api/admin/applications/pdf?id=${application.id}`}
                      >
                        Download PDF
                      </a>
                      <button
                        className="btn btn-sm btn-warning actionBtn"
                        type="button"
                        disabled={sendingEmailId === application.id}
                        onClick={async () => {
                          setSendingEmailId(application.id);
                          setActionMessage({ type: "", text: "" });

                          try {
                            const result = await sendApplicationEmail(application.id);
                            showToast(
                              "success",
                              "Email to student",
                              result?.message || "Email sent successfully."
                            );
                            if (selectedApplication?.id === application.id) {
                              setActionMessage({
                                type: "success",
                                text: result.message,
                              });
                            }
                          } catch (error) {
                            showToast(
                              "danger",
                              "Email to student failed",
                              error.message || "Unable to send email."
                            );
                            if (selectedApplication?.id === application.id) {
                              setActionMessage({
                                type: "error",
                                text: error.message,
                              });
                            }
                          } finally {
                            setSendingEmailId(null);
                          }
                        }}
                      >
                        {sendingEmailId === application.id
                          ? "Sending..."
                          : "Email to Student"}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning actionBtn"
                        type="button"
                        disabled={sendingAuthorityEmailId === application.id}
                        onClick={async () => {
                          setSendingAuthorityEmailId(application.id);
                          setActionMessage({ type: "", text: "" });

                          try {
                            const result = await sendAuthorityEmail(application.id);
                            showToast(
                              "success",
                              "Email to authority",
                              result?.message || "Email sent successfully."
                            );
                            if (selectedApplication?.id === application.id) {
                              setActionMessage({
                                type: "success",
                                text: result.message,
                              });
                            }
                          } catch (error) {
                            showToast(
                              "danger",
                              "Email to authority failed",
                              error.message || "Unable to send authority email."
                            );
                            if (selectedApplication?.id === application.id) {
                              setActionMessage({
                                type: "error",
                                text: error.message,
                              });
                            }
                          } finally {
                            setSendingAuthorityEmailId(null);
                          }
                        }}
                      >
                        {sendingAuthorityEmailId === application.id
                          ? "Sending..."
                          : "Email to Authority"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleApplications.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No applications found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .filterCard {
          background: linear-gradient(135deg, #f8fbff 0%, #f4f7ff 100%);
        }
        .filterInput {
          border-color: #d7dff0;
        }
        .filterInput:focus {
          border-color: #8094f7;
          box-shadow: 0 0 0 0.2rem rgba(92, 112, 245, 0.15) !important;
        }
        .clearBtn {
          font-weight: 600;
        }
        .tableHead th {
          background: #eef3ff !important;
          color: #24345d;
          font-weight: 700;
          border-bottom: 1px solid #dbe4ff;
          border-right: 1px solid #dbe4ff;
          white-space: nowrap;
          padding: 0.95rem 0.85rem;
        }
        .tableHead th:last-child {
          border-right: 0;
        }
        .adminTable td,
        .adminTable th {
          padding-top: 0.95rem;
          padding-bottom: 0.95rem;
          padding-left: 0.85rem;
          padding-right: 0.85rem;
          vertical-align: middle;
        }
        .adminTable tbody td {
          border-right: 1px solid #edf1ff;
          border-bottom: 1px solid #e6ecff;
        }
        .adminTable tbody td:last-child {
          border-right: 0;
        }
        .tableRow:hover {
          background: #f9fbff;
        }
        .actionWrap {
          align-items: center;
        }
        .actionBtn {
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.35rem 0.72rem;
          line-height: 1.2;
          white-space: nowrap;
        }
        :global(.adminToastContainer) {
          position: fixed;
          top: 12px;
          right: 12px;
        }
        :global(.adminToast) {
          min-width: 300px;
          max-width: min(460px, calc(100vw - 24px));
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28);
          overflow: hidden;
        }
        :global(.adminToast .toast-header) {
          font-weight: 700;
        }
      `}</style>

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
                const successText =
                  result?.message ||
                  "Application approved. You can now download the PDF.";
                showToast("success", "Approved", successText);
                setActionMessage({
                  type: "success",
                  text: "Application approved. You can now download the PDF.",
                });
              } catch (error) {
                showToast(
                  "danger",
                  "Approval failed",
                  error.message || "Unable to approve application."
                );
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

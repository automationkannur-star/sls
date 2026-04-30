"use client";

import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

const PAGE_SIZE = 10;

const parseUploadedFileUrls = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export default function StudentRequestsTable({ studentRequests }) {
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFiles, setReplyFiles] = useState([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  const normalizedRequests = useMemo(
    () =>
      (Array.isArray(studentRequests) ? studentRequests : []).map((request) => ({
        ...request,
        uploaded_file_urls: parseUploadedFileUrls(request.uploaded_file_urls),
      })),
    [studentRequests]
  );

  const visibleRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return normalizedRequests.filter((request) => {
      if (priorityFilter !== "all" && request.priority !== priorityFilter) {
        return false;
      }
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        String(request.id || ""),
        request.student_name || "",
        request.email || "",
        request.mobile_number || "",
        request.admission_number || "",
        request.request_subject || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [normalizedRequests, priorityFilter, searchText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleRequests.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const start = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageRows = visibleRequests.slice(start, start + PAGE_SIZE);

  const sendReply = async () => {
    if (!replyTarget) {
      return;
    }
    if (!String(replyMessage || "").trim()) {
      setActionMessage({ type: "danger", text: "Reply message is required." });
      return;
    }
    if (replyFiles.length > 2) {
      setActionMessage({ type: "danger", text: "Maximum 2 attachments allowed." });
      return;
    }

    setIsSendingReply(true);
    setActionMessage({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("id", String(replyTarget.id));
      formData.append("replyMessage", replyMessage.trim());
      replyFiles.forEach((file) => {
        formData.append("attachments", file);
      });
      const response = await fetch("/api/admin/student-requests/reply", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || "Unable to send reply.");
      }
      setActionMessage({ type: "success", text: result.message || "Reply sent successfully." });
      setReplyTarget(null);
      setReplyMessage("");
      setReplyFiles([]);
    } catch (error) {
      setActionMessage({
        type: "danger",
        text: String(error?.message || "Unable to send reply."),
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <>
      {actionMessage.text ? (
        <div className={`alert alert-${actionMessage.type} py-2 mb-3`} role="alert">
          {actionMessage.text}
        </div>
      ) : null}

      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <div>
          <label className="form-label mb-1">Search</label>
          <input
            className="form-control"
            type="text"
            placeholder="ID, name, email, mobile..."
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div>
          <label className="form-label mb-1">Priority</label>
          <select
            className="form-select"
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="form-label mb-1">Status</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle mb-2">
          <thead>
            <tr>
              <th>ID</th>
              <th>Created At</th>
              <th>Student Name</th>
              <th>Subject</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No student requests found.
                </td>
              </tr>
            ) : (
              pageRows.map((request) => (
                <tr key={request.id}>
                  <td>{request.id}</td>
                  <td>{formatDateTime(request.created_at_display || request.created_at)}</td>
                  <td>{request.student_name || "-"}</td>
                  <td>{request.request_subject || "-"}</td>
                  <td>{request.priority || "-"}</td>
                  <td>{request.status || "-"}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => {
                          setReplyTarget(request);
                          setReplyMessage("");
                          setReplyFiles([]);
                        }}
                      >
                        Reply
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">
          Showing {pageRows.length} of {visibleRequests.length}
        </small>
        <div className="d-flex align-items-center gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="small">
            Page {safeCurrentPage} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal show={Boolean(selectedRequest)} onHide={() => setSelectedRequest(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Student Request Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <dl className="row mb-0">
              <dt className="col-sm-4">Request ID</dt>
              <dd className="col-sm-8">{selectedRequest.id}</dd>

              <dt className="col-sm-4">Student Name</dt>
              <dd className="col-sm-8">{selectedRequest.student_name || "-"}</dd>

              <dt className="col-sm-4">Email</dt>
              <dd className="col-sm-8">{selectedRequest.email || "-"}</dd>

              <dt className="col-sm-4">Mobile Number</dt>
              <dd className="col-sm-8">{selectedRequest.mobile_number || "-"}</dd>

              <dt className="col-sm-4">Admission Number</dt>
              <dd className="col-sm-8">{selectedRequest.admission_number || "-"}</dd>

              <dt className="col-sm-4">Course</dt>
              <dd className="col-sm-8">{selectedRequest.course || "-"}</dd>

              <dt className="col-sm-4">Semester</dt>
              <dd className="col-sm-8">{selectedRequest.semester || "-"}</dd>

              <dt className="col-sm-4">Batch</dt>
              <dd className="col-sm-8">{selectedRequest.batch || "-"}</dd>

              <dt className="col-sm-4">Priority</dt>
              <dd className="col-sm-8">{selectedRequest.priority || "-"}</dd>

              <dt className="col-sm-4">Status</dt>
              <dd className="col-sm-8">{selectedRequest.status || "-"}</dd>

              <dt className="col-sm-4">Subject</dt>
              <dd className="col-sm-8">{selectedRequest.request_subject || "-"}</dd>

              <dt className="col-sm-4">Message</dt>
              <dd className="col-sm-8" style={{ whiteSpace: "pre-wrap" }}>
                {selectedRequest.message || "-"}
              </dd>

              <dt className="col-sm-4">Uploaded Files</dt>
              <dd className="col-sm-8">
                {selectedRequest.uploaded_file_urls?.length > 0 ? (
                  <ul className="mb-0 ps-3">
                    {selectedRequest.uploaded_file_urls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  "-"
                )}
              </dd>
            </dl>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={Boolean(replyTarget)} onHide={() => setReplyTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reply to Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2 small text-muted">
            To: {replyTarget?.student_name || "-"} ({replyTarget?.email || "-"})
          </div>
          <div className="mb-3">
            <label className="form-label">Message</label>
            <textarea
              className="form-control"
              rows={5}
              value={replyMessage}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Enter reply message"
            />
          </div>
          <div>
            <label className="form-label">
              Attach Documents (max 2, PDF/PNG/JPEG, under 1 MB each)
            </label>
            <input
              className="form-control"
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg"
              onChange={(event) => setReplyFiles(Array.from(event.target.files || []))}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setReplyTarget(null)} disabled={isSendingReply}>
            Cancel
          </Button>
          <Button variant="primary" onClick={sendReply} disabled={isSendingReply}>
            {isSendingReply ? "Sending..." : "Send"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

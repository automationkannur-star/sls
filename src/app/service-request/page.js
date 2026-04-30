"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

const SEMESTER_REGEX = /^[1-9]$/;
const BATCH_YEAR_REGEX = /^\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;
const MIN_BATCH_YEAR = 2015;
const MAX_BATCH_YEAR = 2028;
const COURSE_OPTIONS = ["LLB", "LLM"];
const SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, index) => String(index + 1));
const BATCH_OPTIONS = Array.from(
  { length: MAX_BATCH_YEAR - MIN_BATCH_YEAR + 1 },
  (_, index) => String(MIN_BATCH_YEAR + index)
);
const PRIORITY_OPTIONS = ["Critical", "High", "Medium", "Low"];
const MAX_FILE_COUNT = 2;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const INITIAL_FORM = {
  studentName: "",
  email: "",
  mobileNumber: "",
  admissionNumber: "",
  course: "",
  semester: "",
  batch: "",
  requestSubject: "",
  message: "",
  priority: "",
};

export default function ServiceRequestPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCriticalConfirmModal, setShowCriticalConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitMessage({ type: "", text: "" });
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePriorityChange = (value) => {
    if (value === "Critical") {
      setShowCriticalConfirmModal(true);
      return;
    }
    setField("priority", value);
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.studentName.trim()) {
      nextErrors.studentName = "Student name is required.";
    }
    if (!form.admissionNumber.trim()) {
      nextErrors.admissionNumber = "Admission number is required.";
    }
    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!form.mobileNumber.trim()) {
      nextErrors.mobileNumber = "Mobile number is required.";
    } else if (!MOBILE_REGEX.test(form.mobileNumber.trim())) {
      nextErrors.mobileNumber = "Mobile number must be exactly 10 digits.";
    }
    if (!COURSE_OPTIONS.includes(form.course)) {
      nextErrors.course = "Please select a course.";
    }
    if (!SEMESTER_OPTIONS.includes(form.semester)) {
      nextErrors.semester = "Please select semester.";
    }
    if (!BATCH_OPTIONS.includes(form.batch)) {
      nextErrors.batch = "Please select batch.";
    } else if (!BATCH_YEAR_REGEX.test(form.batch.trim())) {
      nextErrors.batch = "Batch year must be in YYYY format.";
    }
    if (!form.requestSubject.trim()) {
      nextErrors.requestSubject = "Request subject is required.";
    }
    if (!form.message.trim()) {
      nextErrors.message = "Message is required.";
    }
    if (!form.priority || !PRIORITY_OPTIONS.includes(form.priority)) {
      nextErrors.priority = "Please select a priority.";
    }
    if (uploadedFiles.length > MAX_FILE_COUNT) {
      nextErrors.uploadedFiles = "You can upload a maximum of 2 files.";
    } else {
      const hasInvalidFile = uploadedFiles.some(
        (file) =>
          !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES
      );
      if (hasInvalidFile) {
        nextErrors.uploadedFiles =
          "Only PDF/PNG/JPEG files under 1 MB each are allowed.";
      }
    }
    return nextErrors;
  };

  const handleFilesChange = (event) => {
    const fileList = Array.from(event.target.files || []);
    setUploadedFiles(fileList);
    setSubmitMessage({ type: "", text: "" });
    setErrors((prev) => ({ ...prev, uploadedFiles: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage({ type: "", text: "" });
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const multipartData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        multipartData.append(key, value);
      });
      uploadedFiles.forEach((file) => {
        multipartData.append("uploadedFiles", file);
      });
      const response = await fetch("/api/service-requests", {
        method: "POST",
        body: multipartData,
      });
      const result = await response.json();
      if (!response.ok) {
        setSubmitMessage({
          type: "error",
          text: result?.message || "Unable to submit student request.",
        });
        return;
      }
      setSubmitMessage({ type: "", text: "" });
      setForm(INITIAL_FORM);
      setUploadedFiles([]);
      setErrors({});
      setShowSuccessModal(true);
    } catch {
      setSubmitMessage({
        type: "error",
        text: "Unable to connect to the server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Student Request</h1>

        <div className={styles.grid}>
          <div className={styles.fieldGroup}>
            <input
              className={`${styles.input} ${errors.studentName ? styles.inputError : ""}`}
              type="text"
              placeholder="Student Name"
              value={form.studentName}
              onChange={(e) => setField("studentName", e.target.value)}
            />
            {errors.studentName && <p className={styles.errorText}>{errors.studentName}</p>}
          </div>

          <div className={styles.fieldGroup}>
            <input
              className={`${styles.input} ${errors.admissionNumber ? styles.inputError : ""}`}
              type="text"
              placeholder="Admission Number"
              value={form.admissionNumber}
              onChange={(e) => setField("admissionNumber", e.target.value)}
            />
            {errors.admissionNumber && (
              <p className={styles.errorText}>{errors.admissionNumber}</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            {errors.email && <p className={styles.errorText}>{errors.email}</p>}
          </div>

          <div className={styles.fieldGroup}>
            <input
              className={`${styles.input} ${errors.mobileNumber ? styles.inputError : ""}`}
              type="tel"
              placeholder="Mobile Number"
              value={form.mobileNumber}
              onChange={(e) => setField("mobileNumber", e.target.value)}
            />
            {errors.mobileNumber && <p className={styles.errorText}>{errors.mobileNumber}</p>}
          </div>

          <div className={`${styles.threeColRow} ${styles.fullWidth}`}>
            <div className={styles.fieldGroup}>
              <select
                className={`${styles.input} ${errors.course ? styles.inputError : ""}`}
                value={form.course}
                onChange={(e) => setField("course", e.target.value)}
              >
                <option value="">Select Course</option>
                {COURSE_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.course && <p className={styles.errorText}>{errors.course}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <select
                className={`${styles.input} ${errors.semester ? styles.inputError : ""}`}
                value={form.semester}
                onChange={(e) => setField("semester", e.target.value)}
              >
                <option value="">Select Semester</option>
                {SEMESTER_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.semester && <p className={styles.errorText}>{errors.semester}</p>}
            </div>

            <div className={styles.fieldGroup}>
              <select
                className={`${styles.input} ${errors.batch ? styles.inputError : ""}`}
                value={form.batch}
                onChange={(e) => setField("batch", e.target.value)}
              >
                <option value="">Select Batch</option>
                {BATCH_OPTIONS.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.batch && <p className={styles.errorText}>{errors.batch}</p>}
            </div>
          </div>

          <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
            <input
              className={`${styles.input} ${errors.requestSubject ? styles.inputError : ""}`}
              type="text"
              placeholder="Request Subject"
              value={form.requestSubject}
              onChange={(e) => setField("requestSubject", e.target.value)}
            />
            {errors.requestSubject && (
              <p className={styles.errorText}>{errors.requestSubject}</p>
            )}
          </div>

          <div className={`${styles.fieldGroup} ${styles.priorityField}`}>
            <select
              className={`${styles.input} ${errors.priority ? styles.inputError : ""}`}
              value={form.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
            >
              <option value="">Select Priority</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.priority && <p className={styles.errorText}>{errors.priority}</p>}
          </div>
        </div>

        <div className={styles.priorityHelp}>
          <p><strong>Priority Guidance</strong></p>
          <p>Critical - Need to resolve within 2hrs.</p>
          <p>High - Need to resolve in 2 days.</p>
          <p>Medium - Need to resolve in 5days.</p>
          <p>Low - Information, need to resolve in 1 month.</p>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.uploadLabel} htmlFor="uploaded-files">
            Upload Files (max 2, PDF/PNG/JPEG, under 1 MB each)
          </label>
          <input
            id="uploaded-files"
            className={`${styles.input} ${errors.uploadedFiles ? styles.inputError : ""}`}
            type="file"
            multiple
            accept=".pdf,image/png,image/jpeg"
            onChange={handleFilesChange}
          />
          {uploadedFiles.length > 0 && (
            <p className={styles.uploadHint}>
              Selected: {uploadedFiles.map((file) => file.name).join(", ")}
            </p>
          )}
          {errors.uploadedFiles && <p className={styles.errorText}>{errors.uploadedFiles}</p>}
        </div>

        <div className={styles.fieldGroup}>
          <textarea
            className={`${styles.textarea} ${errors.message ? styles.inputError : ""}`}
            placeholder="Message"
            rows={6}
            value={form.message}
            onChange={(e) => setField("message", e.target.value)}
          />
          {errors.message && <p className={styles.errorText}>{errors.message}</p>}
        </div>

        {submitMessage.type === "error" && submitMessage.text && (
          <p
            className={`${styles.submitMessage} ${
              submitMessage.type === "success" ? styles.submitMessageSuccess : styles.submitMessageError
            }`}
          >
            {submitMessage.text}
          </p>
        )}

        <div className={styles.submitRow}>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Student Request"}
          </button>
        </div>
      </form>
      <Modal
        show={showCriticalConfirmModal}
        onHide={() => {
          setShowCriticalConfirmModal(false);
          setField("priority", "");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Critical Priority</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Choose only if the request is needed in higher priority. May reject based on
          the office discretion if not so relevant.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCriticalConfirmModal(false);
              setField("priority", "");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowCriticalConfirmModal(false);
              setField("priority", "Critical");
            }}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Request Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Successfully submited the request. You will get response from office based on
          the priority. Office staff may get in touch with you if needed
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

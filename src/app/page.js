"use client";

import styles from "./page.module.css";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function Home() {
  const MAX_STUDENTS = 5;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const BATCH_YEAR_REGEX = /^\d{4}$/;
  const MIN_BATCH_YEAR = 2015;
  const MAX_BATCH_YEAR = 2050;

  const [students, setStudents] = useState([
    {
      studentName: "",
      email: "",
      admissionNumber: "",
      semester: "",
      batch: "",
    },
  ]);
  const [authorityDetails, setAuthorityDetails] = useState({
    authorityName: "",
    email: "",
    place: "",
    sendAsEmail: false,
  });
  const [needsAuthorityRequest, setNeedsAuthorityRequest] = useState(false);
  const [errors, setErrors] = useState({
    studentNames: {},
    studentAdmissionNumbers: {},
    studentSemesters: {},
    studentBatchYears: {},
    firstStudentEmail: "",
    authorityName: "",
    authorityEmail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({
    type: "",
    text: "",
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const resetForm = () => {
    setStudents([
      {
        studentName: "",
        email: "",
        admissionNumber: "",
        semester: "",
        batch: "",
      },
    ]);
    setAuthorityDetails({
      authorityName: "",
      email: "",
      place: "",
      sendAsEmail: false,
    });
    setNeedsAuthorityRequest(false);
    setErrors({
      studentNames: {},
      studentAdmissionNumbers: {},
      studentSemesters: {},
      studentBatchYears: {},
      firstStudentEmail: "",
      authorityName: "",
      authorityEmail: "",
    });
    setSubmitMessage({ type: "", text: "" });
  };

  const handleFieldChange = (index, field, value) => {
    setSubmitMessage({ type: "", text: "" });
    setStudents((prevStudents) =>
      prevStudents.map((student, studentIndex) =>
        studentIndex === index ? { ...student, [field]: value } : student
      )
    );

    if (field === "studentName") {
      setErrors((prevErrors) => {
        if (!prevErrors.studentNames[index]) {
          return prevErrors;
        }

        const updatedStudentNameErrors = { ...prevErrors.studentNames };
        delete updatedStudentNameErrors[index];

        return {
          ...prevErrors,
          studentNames: updatedStudentNameErrors,
        };
      });
    }

    if (field === "email" && index === 0) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        firstStudentEmail: "",
      }));
    }

    if (field === "batch") {
      setErrors((prevErrors) => {
        if (!prevErrors.studentBatchYears[index]) {
          return prevErrors;
        }

        const updatedBatchYearErrors = { ...prevErrors.studentBatchYears };
        delete updatedBatchYearErrors[index];

        return {
          ...prevErrors,
          studentBatchYears: updatedBatchYearErrors,
        };
      });
    }

    if (field === "admissionNumber") {
      setErrors((prevErrors) => {
        if (!prevErrors.studentAdmissionNumbers[index]) {
          return prevErrors;
        }

        const updatedAdmissionErrors = { ...prevErrors.studentAdmissionNumbers };
        delete updatedAdmissionErrors[index];

        return {
          ...prevErrors,
          studentAdmissionNumbers: updatedAdmissionErrors,
        };
      });
    }

    if (field === "semester") {
      setErrors((prevErrors) => {
        if (!prevErrors.studentSemesters[index]) {
          return prevErrors;
        }

        const updatedSemesterErrors = { ...prevErrors.studentSemesters };
        delete updatedSemesterErrors[index];

        return {
          ...prevErrors,
          studentSemesters: updatedSemesterErrors,
        };
      });
    }
  };

  const addNewStudent = () => {
    setSubmitMessage({ type: "", text: "" });
    setStudents((prevStudents) => {
      if (prevStudents.length >= MAX_STUDENTS) {
        return prevStudents;
      }

      return [
        ...prevStudents,
        {
          studentName: "",
          email: "",
          admissionNumber: "",
          semester: "",
          batch: "",
        },
      ];
    });
  };

  const removeStudent = (indexToRemove) => {
    setStudents((prevStudents) => {
      if (prevStudents.length === 1) {
        return prevStudents;
      }

      return prevStudents.filter((_, index) => index !== indexToRemove);
    });
    setErrors((prevErrors) => ({
      ...prevErrors,
      studentNames: {},
      studentAdmissionNumbers: {},
      studentSemesters: {},
      studentBatchYears: {},
    }));
    setSubmitMessage({ type: "", text: "" });
  };

  const handleAuthorityChange = (field, value) => {
    setAuthorityDetails((prevDetails) => ({
      ...prevDetails,
      [field]: value,
    }));
    setSubmitMessage({ type: "", text: "" });

    if (field === "authorityName") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        authorityName: "",
      }));
    }

    if (field === "email") {
      setErrors((prevErrors) => ({
        ...prevErrors,
        authorityEmail: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage({ type: "", text: "" });

    const studentNameErrors = {};
    const studentAdmissionNumberErrors = {};
    const studentSemesterErrors = {};
    const studentBatchYearErrors = {};

    students.forEach((student, index) => {
      if (!student.studentName.trim()) {
        studentNameErrors[index] = "Student name is required.";
      }

      if (!String(student.admissionNumber || "").trim()) {
        studentAdmissionNumberErrors[index] = "Admission number is required.";
      }

      if (!String(student.semester || "").trim()) {
        studentSemesterErrors[index] = "Semester is required.";
      }

      const batchYear = String(student.batch || "").trim();
      if (!BATCH_YEAR_REGEX.test(batchYear)) {
        studentBatchYearErrors[index] = "Batch year must be in YYYY format.";
        return;
      }

      const batchYearNumber = Number(batchYear);
      if (batchYearNumber < MIN_BATCH_YEAR || batchYearNumber > MAX_BATCH_YEAR) {
        studentBatchYearErrors[index] = "Batch year must be between 2015 and 2050.";
      }
    });

    let authorityNameError = "";
    if (needsAuthorityRequest && !authorityDetails.authorityName.trim()) {
      authorityNameError = "Authority name is required.";
    }

    let firstStudentEmailError = "";
    const firstStudentEmail = students[0]?.email?.trim() || "";
    if (!firstStudentEmail) {
      firstStudentEmailError = "Email is required for the first student.";
    } else if (!EMAIL_REGEX.test(firstStudentEmail)) {
      firstStudentEmailError = "Enter a valid email for the first student.";
    }

    let authorityEmailError = "";
    if (needsAuthorityRequest && authorityDetails.sendAsEmail) {
      const authorityEmail = authorityDetails.email?.trim() || "";
      if (!authorityEmail) {
        authorityEmailError = "Authority email is required when Send as email is checked.";
      } else if (!EMAIL_REGEX.test(authorityEmail)) {
        authorityEmailError = "Enter a valid authority email address.";
      }
    }

    setErrors({
      studentNames: studentNameErrors,
      studentAdmissionNumbers: studentAdmissionNumberErrors,
      studentSemesters: studentSemesterErrors,
      studentBatchYears: studentBatchYearErrors,
      firstStudentEmail: firstStudentEmailError,
      authorityName: authorityNameError,
      authorityEmail: authorityEmailError,
    });

    const hasErrors =
      Object.keys(studentNameErrors).length > 0 ||
      Object.keys(studentAdmissionNumberErrors).length > 0 ||
      Object.keys(studentSemesterErrors).length > 0 ||
      Object.keys(studentBatchYearErrors).length > 0 ||
      Boolean(firstStudentEmailError) ||
      Boolean(authorityNameError) ||
      Boolean(authorityEmailError);

    if (hasErrors) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          students,
          needsAuthorityRequest,
          authorityDetails,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setSubmitMessage({
          type: "error",
          text: result.message || "Unable to save application.",
        });
        return;
      }

      setSubmitMessage({ type: "", text: "" });
      setShowSuccessModal(true);
    } catch (error) {
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
      <form className={styles.main} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Internship Application Form</h1>

        <section className={styles.formSection}>
          <div className={styles.sectionHeaderRow}>
            <p className={styles.helperText}>Add up to {MAX_STUDENTS} students</p>
            <button
              className={styles.addButton}
              type="button"
              onClick={addNewStudent}
              disabled={students.length >= MAX_STUDENTS || isSubmitting}
            >
              Add New
            </button>
          </div>

          {students.map((student, index) => (
            <div className={styles.studentBlock} key={index}>
              <div className={styles.fieldGroup}>
                <input
                  id={`student-name-${index}`}
                  className={`${styles.input} ${
                    errors.studentNames[index] ? styles.inputError : ""
                  }`}
                  type="text"
                  value={student.studentName}
                  onChange={(event) =>
                    handleFieldChange(index, "studentName", event.target.value)
                  }
                  placeholder="Student Name"
                />
                {errors.studentNames[index] && (
                  <p className={styles.errorText}>{errors.studentNames[index]}</p>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <input
                  id={`admission-number-${index}`}
                  className={`${styles.input} ${
                    errors.studentAdmissionNumbers[index] ? styles.inputError : ""
                  }`}
                  type="text"
                  value={student.admissionNumber}
                  onChange={(event) =>
                    handleFieldChange(index, "admissionNumber", event.target.value)
                  }
                  placeholder="Admission Number"
                />
                {errors.studentAdmissionNumbers[index] && (
                  <p className={styles.errorText}>
                    {errors.studentAdmissionNumbers[index]}
                  </p>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <input
                  id={`student-email-${index}`}
                  className={`${styles.input} ${
                    index === 0 && errors.firstStudentEmail ? styles.inputError : ""
                  }`}
                  type="email"
                  value={student.email || ""}
                  onChange={(event) =>
                    handleFieldChange(index, "email", event.target.value)
                  }
                  placeholder={
                    index === 0
                      ? "Student Email (Required for first student)"
                      : "Student Email"
                  }
                />
                {index === 0 && errors.firstStudentEmail && (
                  <p className={styles.errorText}>{errors.firstStudentEmail}</p>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <input
                  id={`semester-${index}`}
                  className={`${styles.input} ${
                    errors.studentSemesters[index] ? styles.inputError : ""
                  }`}
                  type="text"
                  value={student.semester}
                  onChange={(event) =>
                    handleFieldChange(index, "semester", event.target.value)
                  }
                  placeholder="Semester"
                />
                {errors.studentSemesters[index] && (
                  <p className={styles.errorText}>{errors.studentSemesters[index]}</p>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <input
                  id={`batch-${index}`}
                  className={`${styles.input} ${
                    errors.studentBatchYears[index] ? styles.inputError : ""
                  }`}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={student.batch}
                  onChange={(event) =>
                    handleFieldChange(
                      index,
                      "batch",
                      event.target.value.replace(/[^\d]/g, "").slice(0, 4)
                    )
                  }
                  placeholder="Batch year (YYYY)"
                />
                {errors.studentBatchYears[index] && (
                  <p className={styles.errorText}>{errors.studentBatchYears[index]}</p>
                )}
              </div>

              <button
                className={styles.removeButton}
                type="button"
                onClick={() => removeStudent(index)}
                disabled={students.length === 1 || isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className={styles.formSection}>
          <label className={styles.checkboxRow} htmlFor="need-authority-request">
            <input
              id="need-authority-request"
              className={styles.checkbox}
              type="checkbox"
              checked={needsAuthorityRequest}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setNeedsAuthorityRequest(isChecked);
                setSubmitMessage({ type: "", text: "" });
                if (!isChecked) {
                  setErrors((prevErrors) => ({
                    ...prevErrors,
                    authorityName: "",
                    authorityEmail: "",
                  }));
                }
              }}
              disabled={isSubmitting}
            />
            <span>Whether need a request to authority?</span>
          </label>

          {needsAuthorityRequest && (
            <div className={styles.authoritySection}>
              <h2 className={styles.sectionTitle}>Applying to Authority</h2>
              <div className={styles.authorityBlock}>
                <div className={styles.fieldGroup}>
                  <input
                    id="authority-name"
                    className={`${styles.input} ${
                      errors.authorityName ? styles.inputError : ""
                    }`}
                    type="text"
                    value={authorityDetails.authorityName}
                    onChange={(event) =>
                      handleAuthorityChange("authorityName", event.target.value)
                    }
                    placeholder="Name / Office Name"
                  />
                  {errors.authorityName && (
                    <p className={styles.errorText}>{errors.authorityName}</p>
                  )}
                </div>
                <input
                  id="authority-place"
                  className={styles.input}
                  type="text"
                  value={authorityDetails.place}
                  onChange={(event) =>
                    handleAuthorityChange("place", event.target.value)
                  }
                  placeholder="Place"
                />
                <div className={styles.fieldGroup}>
                  <input
                    id="authority-email"
                    className={`${styles.input} ${
                      errors.authorityEmail ? styles.inputError : ""
                    }`}
                    type="email"
                    value={authorityDetails.email}
                    onChange={(event) =>
                      handleAuthorityChange("email", event.target.value)
                    }
                    placeholder="Authority Email"
                  />
                  {errors.authorityEmail && (
                    <p className={styles.errorText}>{errors.authorityEmail}</p>
                  )}
                </div>
                <label className={styles.checkboxRow} htmlFor="send-as-email">
                  <input
                    id="send-as-email"
                    className={styles.checkbox}
                    type="checkbox"
                    checked={authorityDetails.sendAsEmail}
                    onChange={(event) =>
                      handleAuthorityChange("sendAsEmail", event.target.checked)
                    }
                    disabled={isSubmitting}
                  />
                  <span>Send as email</span>
                </label>
              </div>
            </div>
          )}
        </section>
        {submitMessage.text && (
          <p
            className={`${styles.submitMessage} ${
              submitMessage.type === "success"
                ? styles.submitMessageSuccess
                : styles.submitMessageError
            }`}
          >
            {submitMessage.text}
          </p>
        )}
        <div className={styles.submitRow}>
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>
      <Modal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Application Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Application submitted Successfully, You will receive the soft copy once
          its approved from the SLS administrative office
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => {
              resetForm();
              setShowSuccessModal(false);
            }}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

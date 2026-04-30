import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";
import { sendServiceRequestAdminEmail } from "@/lib/mailer";

const BATCH_YEAR_REGEX = /^\d{4}$/;
const SEMESTER_REGEX = /^[1-9]$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^\d{10}$/;
const MIN_BATCH_YEAR = 2015;
const MAX_BATCH_YEAR = 2028;
const ALLOWED_COURSES = new Set(["LLB", "LLM"]);
const ALLOWED_PRIORITIES = new Set(["Critical", "High", "Medium", "Low"]);
const MAX_FILE_COUNT = 2;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const ALLOWED_FILE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const EXTENSION_BY_MIME = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};
const UPLOADS_RELATIVE_DIR = path.join("public", "uploads");

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const payload = Object.fromEntries(formData.entries());
    const studentName = String(payload?.studentName || "").trim();
    const email = String(payload?.email || "").trim();
    const mobileNumber = String(payload?.mobileNumber || "").trim();
    const admissionNumber = String(payload?.admissionNumber || "").trim();
    const course = String(payload?.course || "").trim().toUpperCase();
    const semester = String(payload?.semester || "").trim();
    const batch = String(payload?.batch || "").trim();
    const requestSubject = String(payload?.requestSubject || "").trim();
    const message = String(payload?.message || "").trim();
    const priority = String(payload?.priority || "").trim();

    if (!studentName) {
      return NextResponse.json({ message: "Student name is required." }, { status: 400 });
    }
    if (!admissionNumber) {
      return NextResponse.json(
        { message: "Admission number is required." },
        { status: 400 }
      );
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { message: "A valid email is required." },
        { status: 400 }
      );
    }
    if (!mobileNumber || !MOBILE_REGEX.test(mobileNumber)) {
      return NextResponse.json(
        { message: "Mobile number must be exactly 10 digits." },
        { status: 400 }
      );
    }
    if (!ALLOWED_COURSES.has(course)) {
      return NextResponse.json(
        { message: "Course must be one of LLB or LLM." },
        { status: 400 }
      );
    }
    const semesterNumber = Number(semester);
    if (
      !semester ||
      !SEMESTER_REGEX.test(semester) ||
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1 ||
      semesterNumber > 10
    ) {
      return NextResponse.json(
        { message: "Semester must be between 1 and 10." },
        { status: 400 }
      );
    }
    if (!BATCH_YEAR_REGEX.test(batch)) {
      return NextResponse.json(
        { message: "Batch year must be in YYYY format." },
        { status: 400 }
      );
    }
    const batchYear = Number(batch);
    if (batchYear < MIN_BATCH_YEAR || batchYear > MAX_BATCH_YEAR) {
      return NextResponse.json(
        { message: "Batch year must be between 2015 and 2028." },
        { status: 400 }
      );
    }
    if (!requestSubject) {
      return NextResponse.json(
        { message: "Request subject is required." },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json({ message: "Message is required." }, { status: 400 });
    }
    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json(
        { message: "Priority must be one of Critical, High, Medium, Low." },
        { status: 400 }
      );
    }

    const uploadedFiles = formData
      .getAll("uploadedFiles")
      .filter((value) => typeof value === "object" && value !== null && "name" in value);
    if (uploadedFiles.length > MAX_FILE_COUNT) {
      return NextResponse.json(
        { message: "You can upload a maximum of 2 files." },
        { status: 400 }
      );
    }

    const uploadDirPath = path.join(process.cwd(), UPLOADS_RELATIVE_DIR);
    await mkdir(uploadDirPath, { recursive: true });
    const uploadedFileUrls = [];
    for (const file of uploadedFiles) {
      const originalName = String(file.name || "").trim();
      if (!originalName || file.size <= 0) {
        continue;
      }
      if (!ALLOWED_FILE_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { message: "Only PDF, PNG, and JPEG files are allowed." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { message: "Each file must be under 1 MB." },
          { status: 400 }
        );
      }

      const extension = EXTENSION_BY_MIME[file.type] || "";
      const generatedFileName = `${Date.now()}-${randomUUID()}${extension}`;
      const targetPath = path.join(uploadDirPath, generatedFileName);
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(targetPath, Buffer.from(arrayBuffer));
      uploadedFileUrls.push(`/uploads/${generatedFileName}`);
    }

    const result = await pool.query(
      `
        INSERT INTO service_requests (
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
          uploaded_file_urls,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'New')
        RETURNING id, status
      `,
      [
        studentName,
        email,
        mobileNumber,
        admissionNumber,
        course,
        semester,
        batch,
        requestSubject,
        message,
        priority,
        JSON.stringify(uploadedFileUrls),
      ]
    );

    const savedRequest = result.rows[0];
    try {
      await sendServiceRequestAdminEmail({
        serviceRequestId: savedRequest.id,
        studentName,
        email,
        mobileNumber,
        admissionNumber,
        course,
        semester,
        batch,
        requestSubject,
        message,
        priority,
        uploadedFileUrls,
        status: savedRequest.status || "New",
      });
    } catch (mailError) {
      console.error("Service request admin notification failed:", mailError);
    }

    return NextResponse.json(
      {
        id: savedRequest.id,
        status: savedRequest.status || "New",
        message: "Student request submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Student request submit failed:", error);
    return NextResponse.json(
      { message: "Failed to submit student request." },
      { status: 500 }
    );
  }
}

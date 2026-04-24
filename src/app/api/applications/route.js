import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { students, needsAuthorityRequest, authorityDetails } = payload;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const batchYearRegex = /^\d{4}$/;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { message: "At least one student entry is required." },
        { status: 400 }
      );
    }

    const hasMissingStudentName = students.some(
      (student) => !student?.studentName?.trim()
    );
    if (hasMissingStudentName) {
      return NextResponse.json(
        { message: "Student name is required for all student rows." },
        { status: 400 }
      );
    }

    const hasMissingAdmissionNumber = students.some(
      (student) => !String(student?.admissionNumber || "").trim()
    );
    if (hasMissingAdmissionNumber) {
      return NextResponse.json(
        { message: "Admission number is required for all student rows." },
        { status: 400 }
      );
    }

    const hasMissingSemester = students.some(
      (student) => !String(student?.semester || "").trim()
    );
    if (hasMissingSemester) {
      return NextResponse.json(
        { message: "Semester is required for all student rows." },
        { status: 400 }
      );
    }

    const hasInvalidBatchYear = students.some((student) => {
      const batchYear = String(student?.batch || "").trim();
      if (!batchYearRegex.test(batchYear)) {
        return true;
      }

      const yearValue = Number(batchYear);
      return yearValue < 2015 || yearValue > 2050;
    });
    if (hasInvalidBatchYear) {
      return NextResponse.json(
        { message: "Batch year must be in YYYY format between 2015 and 2050." },
        { status: 400 }
      );
    }

    const firstStudentEmail = students[0]?.email?.trim() || "";
    if (!firstStudentEmail || !emailRegex.test(firstStudentEmail)) {
      return NextResponse.json(
        { message: "A valid email is required for the first student." },
        { status: 400 }
      );
    }

    if (needsAuthorityRequest && !authorityDetails?.authorityName?.trim()) {
      return NextResponse.json(
        { message: "Authority name is required." },
        { status: 400 }
      );
    }

    if (needsAuthorityRequest && authorityDetails?.sendAsEmail) {
      const authorityEmail = authorityDetails?.email?.trim() || "";
      if (!authorityEmail || !emailRegex.test(authorityEmail)) {
        return NextResponse.json(
          { message: "A valid authority email is required when Send as email is checked." },
          { status: 400 }
        );
      }
    }

    const result = await pool.query(
      `
        INSERT INTO internship_applications (
          students,
          needs_authority_request,
          authority_name,
          authority_place,
          authority_email,
          send_as_email
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        JSON.stringify(students),
        Boolean(needsAuthorityRequest),
        needsAuthorityRequest ? authorityDetails?.authorityName?.trim() || null : null,
        needsAuthorityRequest ? authorityDetails?.place?.trim() || null : null,
        needsAuthorityRequest ? authorityDetails?.email?.trim() || null : null,
        needsAuthorityRequest ? Boolean(authorityDetails?.sendAsEmail) : false,
      ]
    );

    return NextResponse.json(
      { id: result.rows[0].id, message: "Application saved successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to save application:", error);
    return NextResponse.json(
      { message: "Failed to save application." },
      { status: 500 }
    );
  }
}

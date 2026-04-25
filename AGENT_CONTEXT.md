# Internship Portal - Agent Context

This document summarizes what is already implemented in this repository so future agents can quickly understand the project without rediscovering core flows.

## Project Overview

- Stack: Next.js App Router (`next@16`), React, PostgreSQL, Nodemailer, Puppeteer/PDF tooling.
- Purpose: Internship application portal with student submission flow and admin approval workflow.
- Deployment: Firebase Hosting + Next.js framework backend.

## Implemented User Flows

### Public Submission Flow

- Page: `/` from `src/app/page.js`
- Users submit one or more students in a single application.
- Submission API: `POST /api/applications` in `src/app/api/applications/route.js`
- Stored fields include student list JSON and authority request details.

### Admin Flow

- Login page: `/admin` from `src/app/admin/page.js`
- Login API: `POST /api/admin/login` in `src/app/api/admin/login/route.js`
- Dashboard: `/admin/dashboard` from `src/app/admin/dashboard/page.js`
- Logout API: `POST /api/admin/logout` in `src/app/api/admin/logout/route.js`
- Session protection uses JWT cookie helpers from `src/lib/adminAuth.js`.

## API Surface (Current)

### Public

- `POST /api/applications`
  - Validate request payload.
  - Insert into `internship_applications`.

### Admin

- `POST /api/admin/login`
  - Verify admin user credentials (`admin_users` table).
  - Set signed session cookie.
- `POST /api/admin/logout`
  - Clear session cookie.
- `POST /api/admin/applications/approve`
  - Mark application approved (`is_approved`, `approved_at`, `approved_by`).
  - Attempt to email generated PDF to student recipients.
- `GET /api/admin/applications/pdf?id=...`
  - Generate/download application PDF for an application ID.
- `POST /api/admin/applications/send-email`
  - Send application PDF to student addresses.
- `POST /api/admin/applications/send-authority-email`
  - Send authority request email for application.
- `POST /api/admin/applications/delete`
  - Bulk delete applications by IDs.

## Data Model (Inferred From Queries)

### `internship_applications`

- `id`
- `students` (JSON/JSONB; each student has `studentName`, `email`, `admissionNumber`, `semester`, `batch`)
- `needs_authority_request`
- `authority_name`
- `authority_place`
- `authority_email`
- `send_as_email`
- `created_at`
- `is_approved`
- `approved_at`
- `approved_by`

### `admin_users`

- `id`
- `username`
- `password_hash`
- `is_active`

## Core Libraries and Responsibilities

- `src/lib/db.js`
  - PostgreSQL connection pool.
- `src/lib/adminAuth.js`
  - JWT sign/verify + cookie helpers for admin sessions.
- `src/lib/mailer.js`
  - SMTP transporter and email send utilities.
- `src/lib/applicationPdf.js`
  - PDF generation pipeline.
  - Uses Puppeteer/Chromium path selection and development fallback behavior.

## Templates and Assets

- `src/templates/internship-template.html` - application content template.
- `src/templates/institution-template.html` - authority/institution mail template.
- `src/templates/assets/*` - static template assets.

## Environment Variables (Expected)

- `DATABASE_URL` (required)
- `PGDATABASE` (optional override)
- `ADMIN_JWT_SECRET` (required)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL` (optional cc target)
- `NODE_ENV` (runtime behavior differences)
- `VERCEL` (runtime switch for Chromium handling)

## Operational Notes

- Admin approval updates DB even if email send fails (email is best-effort in approve route).
- Authority email endpoint currently sends when authority email exists; it does not strictly enforce `needs_authority_request`.
- Development has a fallback PDF path for some failures; production returns error on generation failures.
- Dashboard dropdown includes UI options (Profile/Settings) without backend handlers.

## Recommended Starting Points For New Agents

1. Read `README.md` and this file first.
2. Review API handlers under `src/app/api`.
3. Review session logic in `src/lib/adminAuth.js`.
4. Review PDF and mail flow in `src/lib/applicationPdf.js` and `src/lib/mailer.js`.
5. Confirm DB schema aligns with inferred columns before making schema-sensitive changes.

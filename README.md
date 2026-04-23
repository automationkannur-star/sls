# sls

Internship application portal with:
- Dynamic student form submission
- Authority request details
- Admin login and dashboard
- Approval workflow and PDF generation

## Dev Deployment (Firebase CLI)

This app uses dynamic Next.js routes and API endpoints, so it needs Firebase services that require the Blaze plan.

Use a separate Firebase project for development:
- `prod` -> `sls-kannur`
- `dev` -> `sls-kannur-dev`

### 1) Create the dev Firebase project

Create project `sls-kannur-dev` in Firebase console.

### 2) Login and verify projects

```bash
npm run firebase:login
npm run firebase:projects
```

### 3) Set deployment aliases (if needed)

If aliases are missing locally, run:

```bash
firebase use --add
```

Pick:
- project `sls-kannur-dev` -> alias `dev`
- project `sls-kannur` -> alias `prod`

### 4) Configure environment variables in Firebase

For each project, add the required server variables before deploy:
- `DATABASE_URL`
- `PGDATABASE`
- `ADMIN_JWT_SECRET`

### 5) Deploy dev / prod from CLI

```bash
npm run deploy:dev
```

```bash
npm run deploy:prod
```

## Access from other networks

Cloud deployment gives a public URL (for example `*.web.app`), so your dev app can be opened from any network/browser.

To protect dev:
- keep admin auth enabled
- use strong secrets
- add budget alerts in Google Cloud billing

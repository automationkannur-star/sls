/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/applications/pdf": ["./node_modules/@sparticuz/chromium/**"],
    "/api/admin/applications/pdf/route": ["./node_modules/@sparticuz/chromium/**"],
    "/api/admin/applications/send-email": ["./node_modules/@sparticuz/chromium/**"],
    "/api/admin/applications/send-email/route": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default nextConfig;

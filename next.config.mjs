/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/applications/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/admin/applications/pdf/route": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;

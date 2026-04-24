import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header border-bottom bg-white shadow-sm">
      <div className="container py-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Link
            href="/"
            className="d-flex align-items-center gap-3 text-decoration-none text-body"
          >
            <Image
              src="/logo.png"
              alt="School of Legal Studies"
              width={48}
              height={48}
              className="rounded-2 flex-shrink-0"
              priority
            />
            <div className="text-start">
              <div className="fw-bold fs-5 lh-sm">School of Legal Studies</div>
              <div className="text-muted small">Internship Application</div>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

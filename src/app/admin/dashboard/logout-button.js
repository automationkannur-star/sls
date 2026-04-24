"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DUMMY_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="40" fill="#dbeafe"/>
      <circle cx="40" cy="31" r="14" fill="#60a5fa"/>
      <path d="M14 70c4-12 15-20 26-20s22 8 26 20" fill="#60a5fa"/>
    </svg>`
  );

export default function LogoutButton({ username = "Admin" }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
      router.push("/admin");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div className="adminProfileMenu" ref={menuRef}>
      <button
        className="btn adminAvatarTrigger d-flex align-items-center justify-content-center"
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <img src={DUMMY_AVATAR} alt="Admin avatar" className="adminAvatar" />
      </button>

      {menuOpen && (
        <div className="card shadow-sm border-0 adminMenuDropdown overflow-hidden" role="menu">
          <div className="px-3 py-3 border-bottom bg-white">
            <div className="fw-semibold text-dark">{username}</div>
            <div className="small text-muted">admin@example.com</div>
          </div>

          <button
            className="btn btn-link text-dark text-start w-100 px-3 py-2 text-decoration-none adminMenuItem"
            type="button"
            role="menuitem"
          >
            <span className="adminMenuIcon">👤</span>
            <span>Profile</span>
          </button>

          <button
            className="btn btn-link text-dark text-start w-100 px-3 py-2 text-decoration-none adminMenuItem"
            type="button"
            role="menuitem"
          >
            <span className="adminMenuIcon">⚙️</span>
            <span>Settings</span>
          </button>

          <div className="border-top my-1" />

          <button
            className="btn btn-link text-dark text-start w-100 px-3 py-2 text-decoration-none adminMenuItem"
            type="button"
            disabled={isLoading}
            onClick={handleLogout}
            role="menuitem"
          >
            <span className="adminMenuIcon">↪</span>
            <span>{isLoading ? "Signing out..." : "Log out"}</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .adminProfileMenu {
          position: relative;
        }
        .adminAvatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          object-fit: cover;
        }
        .adminAvatarTrigger {
          width: 52px;
          height: 52px;
          padding: 0;
          border: none;
          border-radius: 50%;
          background: transparent;
        }
        .adminAvatarTrigger:focus-visible {
          outline: 2px solid #0d6efd;
          outline-offset: 2px;
        }
        .adminMenuDropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 280px;
          z-index: 1000;
          border-radius: 8px;
          background: #f7f7f7;
        }
        .adminMenuItem {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.05rem;
          border-radius: 0;
        }
        .adminMenuItem:hover {
          background: #efefef;
        }
        .adminMenuIcon {
          width: 20px;
          display: inline-flex;
          justify-content: center;
          color: #7a7a7a;
        }
      `}</style>
    </div>
  );
}

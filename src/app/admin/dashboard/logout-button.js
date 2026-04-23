"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <button
      className="btn btn-outline-danger"
      type="button"
      disabled={isLoading}
      onClick={handleLogout}
    >
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  );
}

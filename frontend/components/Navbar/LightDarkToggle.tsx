"use client";

import { useEffect, useState } from "react";

export default function LightDarkToggle() {
  const [theme, setTheme] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.theme : "light",
  );

  function changeTheme() {
    if (theme === "dark" || theme == undefined) {
      setTheme("light");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  }

  useEffect(() => {
    if (theme === undefined) {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
    if (theme) {
      document.body.setAttribute("data-bs-theme", theme);
    }
  }, [theme]);

  return (
    <div className="text-center items-center mr-5 ">
      <button className="btn" data-testid="light-dark" onClick={changeTheme}>
        <i className="bi bi-lamp-fill" style={{ border: "solid", borderRadius: "10px", padding: "10px", color: "#717a83" }}></i>
      </button>
    </div>
  );
}

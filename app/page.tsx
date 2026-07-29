"use client";

import { useEffect, useState } from "react";
import { LumenApp } from "@/components/lumen/LumenApp";
import { OutputWindowApp } from "@/components/lumen/OutputWindowApp";

export default function Home() {
  // Starts false so the static-export prerender and the first client render
  // match (no window access is safe during either) — the real check runs
  // after mount, matching the second/output BrowserWindow's ?output=1 URL.
  const [isOutputWindow, setIsOutputWindow] = useState(false);
  useEffect(() => {
    setIsOutputWindow(new URLSearchParams(window.location.search).get("output") === "1");
  }, []);

  if (isOutputWindow) return <OutputWindowApp />;
  return <LumenApp accent="#8b5cf6" theme="dark" lyricFont="sans" />;
}

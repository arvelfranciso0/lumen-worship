"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically imported so only the active window's app is bundled.
const LumenApp = dynamic(() => import("@/components/lumen/LumenApp").then((mod) => mod.LumenApp), { ssr: false });
const OutputWindowApp = dynamic(
  () => import("@/components/lumen/OutputWindowApp").then((mod) => mod.OutputWindowApp),
  { ssr: false }
);

type Route = "pending" | "operator" | "output";

export default function Home() {
  // Waits for the output-window check before mounting either app.
  const [route, setRoute] = useState<Route>("pending");
  useEffect(() => {
    const isOutput = new URLSearchParams(window.location.search).get("output") === "1";
    setRoute(isOutput ? "output" : "operator");
  }, []);

  if (route === "pending") return <div className="fixed inset-0 bg-black" />;
  if (route === "output") return <OutputWindowApp />;
  return <LumenApp accent="#8b5cf6" theme="dark" lyricFont="sans" />;
}

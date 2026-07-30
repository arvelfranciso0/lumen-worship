"use client";

import { useEffect, useState } from "react";
import { LumenApp } from "@/components/lumen/LumenApp";
import { OutputWindowApp } from "@/components/lumen/OutputWindowApp";

type Route = "pending" | "operator" | "output";

export default function Home() {
  // Starts "pending" (renders nothing) rather than defaulting to the
  // operator app — defaulting to LumenApp here used to mean the *output*
  // BrowserWindow briefly mounted a full second LumenApp/useLumen() instance
  // of its own before this effect could correct it. That instance's default
  // state (outputEnabled: false, before persisted prefs even load) made its
  // own "close the output window" effect fire immediately — the window
  // closing itself before ever showing the real OutputWindowApp. Neither
  // app may mount until the ?output=1 check (only possible after mount —
  // window isn't available during the static-export prerender) resolves.
  const [route, setRoute] = useState<Route>("pending");
  useEffect(() => {
    const isOutput = new URLSearchParams(window.location.search).get("output") === "1";
    setRoute(isOutput ? "output" : "operator");
  }, []);

  if (route === "pending") return <div className="fixed inset-0 bg-black" />;
  if (route === "output") return <OutputWindowApp />;
  return <LumenApp accent="#8b5cf6" theme="dark" lyricFont="sans" />;
}

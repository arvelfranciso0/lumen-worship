"use client";

import { useEffect, useRef, useState } from "react";

const SHAKE_DURATION_MS = 650;

// Shakes the Updates button once when an update newly becomes pending.
export function useUpdateAlertShake(updatePending: boolean): boolean {
  const [isShaking, setIsShaking] = useState(false);
  const previousUpdatePendingRef = useRef(updatePending);
  useEffect(() => {
    const justBecamePending = updatePending && !previousUpdatePendingRef.current;
    previousUpdatePendingRef.current = updatePending;
    if (!justBecamePending) return;
    setIsShaking(true);
    const timeout = setTimeout(() => setIsShaking(false), SHAKE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [updatePending]);
  return isShaking;
}

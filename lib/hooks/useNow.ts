"use client";

import { useEffect, useState } from "react";

/**
 * A clock that ticks, used for the next-dose countdown. It only starts after
 * mount, so the server-rendered markup and the first client render agree.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

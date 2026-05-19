"use client";

import { useCallback, useEffect, useState } from "react";

import {
  MISTAKES_UPDATED_EVENT,
  getMistakes,
} from "@/lib/mistake-storage";
import type { MistakeRecord } from "@/types/mistake";

export function useMistakes() {
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setMistakes(getMistakes());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);

    const onUpdate = () => refresh();
    window.addEventListener(MISTAKES_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(MISTAKES_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return { mistakes, hydrated, refresh };
}

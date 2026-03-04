"use client";

import { useEffect, useState } from "react";
import { AUTH_TOKEN_CHANGED_EVENT, getToken } from "./api";

export function useAuthToken() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const syncToken = () => {
      setToken(getToken());
    };

    setMounted(true);
    syncToken();

    window.addEventListener("storage", syncToken);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);

    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
    };
  }, []);

  return { mounted, token };
}

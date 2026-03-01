"use client";

import { useEffect, useState } from "react";
import { getToken } from "./api";

export function useAuthToken() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    setMounted(true);
    setToken(getToken());
  }, []);

  return { mounted, token };
}


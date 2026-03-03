"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      await loginAdmin({ identifier, password });
      router.push("/dashboard");
    } catch {
      setError("Invalid credentials.");
    }
  }

  return (
    <main className="authWrap">
      <form className="authCard" onSubmit={onSubmit}>
        <div className="authBrand">
          <img src="/brand/TGMG-mark.svg" alt="TGMG logo" className="authBrandLogo" />
          <div>
            <h1>TGMG Admin</h1>
            <p className="panelSubtitle">Sirf Asli Log. Sirf Ghar Ka Saaman.</p>
          </div>
        </div>
        <input
          className="input"
          placeholder="Email / phone / CNIC"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="btn" type="submit">
          Login
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}


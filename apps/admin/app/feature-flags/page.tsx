"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);

  async function load() {
    setFlags(await adminApi.getFeatureFlags());
  }

  useEffect(() => {
    load().catch(() => setFlags([]));
  }, []);

  return (
    <AdminShell title="Feature Flags">
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Enabled</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.key}>
                <td>{flag.key}</td>
                <td>{String(flag.enabled)}</td>
                <td>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={async () => {
                      await adminApi.toggleFeatureFlag(flag.key, !flag.enabled);
                      await load();
                    }}
                  >
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}

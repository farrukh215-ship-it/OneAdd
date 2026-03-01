"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setFlags(await adminApi.getFeatureFlags());
    } catch {
      setFlags([]);
      setError("Feature flags load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell title="Feature Flags">
      <Panel>
        <PanelHeader title="Feature Flags" subtitle="Runtime switches and controlled rollouts" />
        <TableState loading={loading} empty={!loading && flags.length === 0} emptyText="No flags configured." />
        {!loading && flags.length > 0 ? (
          <table className="table executiveTable">
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
        ) : null}
      </Panel>
      {error ? <p className="error">{error}</p> : null}
    </AdminShell>
  );
}

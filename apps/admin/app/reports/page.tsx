"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

const statuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

export default function ReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminApi.getAdminReports());
    } catch {
      setItems([]);
      setError("Reports load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell title="Reports Queue">
      <Panel>
        <PanelHeader title="Reports Queue" subtitle="Escalations requiring moderation action" />
        <TableState loading={loading} empty={!loading && items.length === 0} emptyText="No reports pending." />
        {!loading && items.length > 0 ? (
          <table className="table executiveTable">
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Target</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.reporter?.email || "-"}</td>
                  <td>
                    {item.targetListing?.title ||
                      item.targetUser?.email ||
                      item.targetThread?.id ||
                      "-"}
                  </td>
                  <td>{item.status}</td>
                  <td>{item.reason || "-"}</td>
                  <td>
                    <select
                      className="input"
                      value={item.status}
                      onChange={async (event) => {
                        await adminApi.updateReportStatus(item.id, event.target.value);
                        await load();
                      }}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
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

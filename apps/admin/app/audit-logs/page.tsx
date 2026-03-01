"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function AuditLogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    adminApi
      .getAuditLogs()
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError("Audit logs load nahi ho sakay.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Audit Logs">
      <Panel>
        <PanelHeader title="Audit Trail" subtitle="Immutable admin activity records" />
        <TableState loading={loading} empty={!loading && items.length === 0} emptyText="No audit logs found." />
        {!loading && items.length > 0 ? (
          <table className="table executiveTable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.admin?.email ?? item.adminId}</td>
                  <td>{item.action}</td>
                  <td>
                    {item.targetType} / {item.targetId}
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

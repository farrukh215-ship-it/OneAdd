"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

export default function AuditLogsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getAuditLogs().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <AdminShell title="Audit Logs">
      <section className="card">
        <table className="table">
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
      </section>
    </AdminShell>
  );
}

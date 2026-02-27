"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

const statuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];

export default function ReportsPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    setItems(await adminApi.getReportsQueue());
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <AdminShell title="Reports Queue">
      <section className="card">
        <table className="table">
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
                <td>{item.reporter?.email}</td>
                <td>
                  {item.targetListing?.title ||
                    item.targetUser?.email ||
                    item.targetThread?.id}
                </td>
                <td>{item.status}</td>
                <td>{item.reason}</td>
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
      </section>
    </AdminShell>
  );
}

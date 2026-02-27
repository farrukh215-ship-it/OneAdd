"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    setItems(await adminApi.getUsers());
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <AdminShell title="Users">
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Blocked</th>
              <th>Shadow Banned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.fullName}</td>
                <td>{item.email}</td>
                <td>{String(item.isBlocked)}</td>
                <td>{String(item.shadowBanned)}</td>
                <td className="actions">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={async () => {
                      await adminApi.suspendUser(item.id, !item.isBlocked);
                      await load();
                    }}
                  >
                    {item.isBlocked ? "Unban" : "Ban"}
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={async () => {
                      await adminApi.shadowBanUser(item.id, !item.shadowBanned);
                      await load();
                    }}
                  >
                    {item.shadowBanned ? "Unshadow" : "Shadow Ban"}
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

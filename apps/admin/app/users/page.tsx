"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminApi.getUsers());
    } catch {
      setItems([]);
      setError("Users load nahi ho sakay.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell title="Users">
      <Panel>
        <PanelHeader title="Users Registry" subtitle="Account moderation and controls" />
        <TableState loading={loading} empty={!loading && items.length === 0} emptyText="No users found." />
        {!loading && items.length > 0 ? (
          <table className="table executiveTable">
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
        ) : null}
      </Panel>
      {error ? <p className="error">{error}</p> : null}
    </AdminShell>
  );
}

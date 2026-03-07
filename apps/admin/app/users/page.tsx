"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

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
                <th>User</th>
                <th>ID / CNIC</th>
                <th>Contact</th>
                <th>City</th>
                <th>Trust</th>
                <th>Activity</th>
                <th>Blocked</th>
                <th>Shadow Banned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.fullName || "Unnamed User"}</strong>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span>{item.id}</span>
                      <span>{item.cnic || "CNIC missing"}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span>{item.phone || "Phone missing"}</span>
                      <span>{item.email || "Email missing"}</span>
                    </div>
                  </td>
                  <td>{item.city || "Unknown"}</td>
                  <td>{item.trustScore?.score ?? 0}</td>
                  <td>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span>Created: {formatDate(item.createdAt)}</span>
                      <span>Updated: {formatDate(item.updatedAt)}</span>
                      <span>Last seen: {formatDate(item.lastSeenAt)}</span>
                    </div>
                  </td>
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

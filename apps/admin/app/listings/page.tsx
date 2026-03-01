"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function ListingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await adminApi.getListings());
    } catch {
      setItems([]);
      setError("Listings load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell title="Listings">
      <Panel>
        <PanelHeader title="Listings Control" subtitle="Moderation and status management" />
        <TableState loading={loading} empty={!loading && items.length === 0} emptyText="No listings found." />
        {!loading && items.length > 0 ? (
          <table className="table executiveTable">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Seller</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.status}</td>
                  <td>{item.user?.fullName}</td>
                  <td>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={async () => {
                        await adminApi.deactivateListing(item.id);
                        await load();
                      }}
                    >
                      Deactivate
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

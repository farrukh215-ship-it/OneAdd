"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

export default function ListingsPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    setItems(await adminApi.getListings());
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  return (
    <AdminShell title="Listings">
      <section className="card">
        <table className="table">
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
      </section>
    </AdminShell>
  );
}

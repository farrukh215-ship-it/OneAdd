"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getCategories();
      setItems(data);
    } catch {
      setItems([]);
      setError("Categories load nahi ho sakin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await adminApi.createCategory({ name, slug });
      setName("");
      setSlug("");
      await load();
    } catch {
      setError("Category add nahi ho saki.");
    }
  }

  return (
    <AdminShell title="Categories">
      <form className="card formRow elevated" onSubmit={onSubmit}>
        <input
          className="input"
          value={name}
          placeholder="Category name"
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="input"
          value={slug}
          placeholder="slug"
          onChange={(event) => setSlug(event.target.value)}
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      <Panel>
        <PanelHeader title="Category Directory" subtitle="Structured taxonomy list" />
        <TableState loading={loading} empty={!loading && items.length === 0} emptyText="No categories found." />
        {!loading && items.length > 0 ? (
          <table className="table executiveTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Depth</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.depth}</td>
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

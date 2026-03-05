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
  const [parentId, setParentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");

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
    setSubmitting(true);
    try {
      await adminApi.createCategory({ name, slug, parentId: parentId || undefined });
      setName("");
      setSlug("");
      setParentId("");
      await load();
    } catch {
      setError("Category add nahi ho saki.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const okay = window.confirm(
      "Category delete karna chahte hain? Agar isme subcategory/listings hongi to delete block hoga."
    );
    if (!okay) {
      return;
    }

    setDeletingId(id);
    setError("");
    try {
      await adminApi.deleteCategory(id);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Category remove nahi ho saki.";
      setError(message);
    } finally {
      setDeletingId("");
    }
  }

  const mainCategories = items.filter((item) => !item.parentId);
  const parentNameById = new Map(items.map((item) => [item.id, item.name]));

  return (
    <AdminShell title="Categories">
      <form className="card formRow elevated" onSubmit={onSubmit}>
        <input
          className="input"
          value={name}
          placeholder="Category name (e.g. Mobiles)"
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="input"
          value={slug}
          placeholder="slug (e.g. mobiles)"
          onChange={(event) => setSlug(event.target.value)}
        />
        <select
          className="input"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        >
          <option value="">Main Category (no parent)</option>
          {mainCategories.map((item) => (
            <option key={item.id} value={item.id}>
              Subcategory under: {item.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Add"}
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
                <th>Type</th>
                <th>Parent</th>
                <th>Depth</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.parentId ? "Subcategory" : "Main Category"}</td>
                  <td>{item.parentId ? parentNameById.get(item.parentId) || "-" : "-"}</td>
                  <td>{item.depth}</td>
                  <td>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => void onDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? "Removing..." : "Remove"}
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

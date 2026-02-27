"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { adminApi } from "../../lib/api";

export default function CategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function load() {
    const data = await adminApi.getCategories();
    setItems(data);
  }

  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await adminApi.createCategory({ name, slug });
    setName("");
    setSlug("");
    await load();
  }

  return (
    <AdminShell title="Categories">
      <form className="card formRow" onSubmit={onSubmit}>
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
      <section className="card">
        <table className="table">
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
      </section>
    </AdminShell>
  );
}

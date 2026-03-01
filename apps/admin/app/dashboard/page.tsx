"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "../../components/admin-shell";
import { Panel, PanelHeader, TableState } from "../../components/ui";
import { adminApi } from "../../lib/api";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [actingId, setActingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [reportsData, usersData, listingsData, flagsData] = await Promise.all([
        adminApi.getAdminReports(),
        adminApi.getUsers(),
        adminApi.getListings(),
        adminApi.getFeatureFlags()
      ]);

      setReports(reportsData);
      setUsers(usersData);
      setListings(listingsData);
      setFlags(flagsData);
    } catch {
      setError("Dashboard data load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const openReports = reports.filter((item) => item.status === "OPEN").length;
    const blockedUsers = users.filter((item) => item.isBlocked).length;
    const activeListings = listings.filter((item) => item.status === "ACTIVE").length;
    const enabledFlags = flags.filter((item) => item.enabled).length;

    return [
      { label: "Open Reports", value: openReports },
      { label: "Blocked Users", value: blockedUsers },
      { label: "Active Listings", value: activeListings },
      { label: "Enabled Flags", value: enabledFlags }
    ];
  }, [flags, listings, reports, users]);

  async function runAction(action: any) {
    setActingId(action.reportId || action.userId || action.listingId || action.action);
    try {
      await adminApi.applyAdminAction(action);
      await load();
    } finally {
      setActingId("");
    }
  }

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <section className="card">
          <p>Loading tables...</p>
        </section>
      ) : null}

      {!loading ? (
        <>
          <section className="metricsGrid">
            {stats.map((item) => (
              <article key={item.label} className="metricCard">
                <p className="metricLabel">{item.label}</p>
                <p className="metricValue">{item.value}</p>
              </article>
            ))}
          </section>

          <Panel>
            <PanelHeader
              title="Reports Queue"
              subtitle="Priority moderation queue"
              actions={
                <button className="btn secondary" type="button" onClick={load}>
                  Refresh
                </button>
              }
            />

            <TableState loading={false} empty={reports.length === 0} emptyText="No reports in queue." />
            {reports.length > 0 ? (
              <table className="table executiveTable">
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
                  {reports.map((item) => (
                    <tr key={item.id}>
                      <td>{item.reporter?.email || "-"}</td>
                      <td>{item.targetListing?.title || item.targetUser?.email || "-"}</td>
                      <td>{item.status}</td>
                      <td>{item.reason || "-"}</td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() =>
                              runAction({ reportId: item.id, action: "REVIEW" })
                            }
                          >
                            Review
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() =>
                              runAction({ reportId: item.id, action: "RESOLVE" })
                            }
                          >
                            Resolve
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() =>
                              runAction({ reportId: item.id, action: "REJECT" })
                            }
                          >
                            Reject
                          </button>
                          {item.targetUser?.id ? (
                            <button
                              className="btn secondary"
                              type="button"
                              disabled={actingId === item.targetUser.id}
                              onClick={() =>
                                runAction({
                                  userId: item.targetUser.id,
                                  action: "SUSPEND_USER"
                                })
                              }
                            >
                              Suspend User
                            </button>
                          ) : null}
                          {item.targetListing?.id ? (
                            <button
                              className="btn secondary"
                              type="button"
                              disabled={actingId === item.targetListing.id}
                              onClick={() =>
                                runAction({
                                  listingId: item.targetListing.id,
                                  action: "DEACTIVATE_LISTING"
                                })
                              }
                            >
                              Deactivate Listing
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Panel>

          <section className="dashboardTwoCol">
            <Panel>
              <PanelHeader title="Users Snapshot" />
              <TableState loading={false} empty={users.length === 0} emptyText="No users found." />
              {users.length > 0 ? (
                <table className="table executiveTable compact">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Blocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 6).map((item) => (
                      <tr key={item.id}>
                        <td>{item.fullName}</td>
                        <td>{item.email}</td>
                        <td>{item.isBlocked ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </Panel>

            <Panel>
              <PanelHeader title="Feature Flags" />
              <TableState loading={false} empty={flags.length === 0} emptyText="No feature flags found." />
              {flags.length > 0 ? (
                <table className="table executiveTable compact">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((item) => (
                      <tr key={item.key}>
                        <td>{item.key}</td>
                        <td>{item.enabled ? "ON" : "OFF"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </Panel>
          </section>

          {error ? <p className="error">{error}</p> : null}
        </>
      ) : null}
    </AdminShell>
  );
}

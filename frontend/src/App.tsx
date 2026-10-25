import { useEffect, useState } from "react";
import {
  Activity,
  AppWindow,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Users,
  Database,
  FlaskConical,
  Ban,
  CheckCircle2,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  window.location.protocol + "//" + window.location.host;
type ApiResult<T> = { success: boolean; data: T; error?: { message?: string } };
type Tab = "overview" | "developers" | "portals" | "apis" | "grants" | "audit";
type Item = Record<string, any>;

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      json?.error?.message || `Request failed (${response.status})`,
    );
  return json as T;
}

function Card({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string | number;
  icon: any;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <Icon size={19} className="text-cyan-300" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <input
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("apiportal_admin_token") || "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [items, setItems] = useState<Item[]>([]);
  const [developers, setDevelopers] = useState<Item[]>([]);
  const [portals, setPortals] = useState<Item[]>([]);
  const [apis, setApis] = useState<Item[]>([]);
  const [grants, setGrants] = useState<Item[]>([]);
  const [audit, setAudit] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [devId, setDevId] = useState("");
  const [devName, setDevName] = useState("");
  const [portalCode, setPortalCode] = useState("");
  const [portalName, setPortalName] = useState("");
  const [portalEnv, setPortalEnv] = useState("development");
  const [newApiCode, setNewApiCode] = useState("");
  const [newApiName, setNewApiName] = useState("");
  const [newApiDescription, setNewApiDescription] = useState("");
  const [grantPrincipalType, setGrantPrincipalType] = useState("developer");
  const [grantPrincipalId, setGrantPrincipalId] = useState("");
  const [grantApiCode, setGrantApiCode] = useState("");
  const [grantEnv, setGrantEnv] = useState("development");
  const [grantReason, setGrantReason] = useState("");
  const [oneTimeKey, setOneTimeKey] = useState("");

  const apiCount = apis.length;
  const activeDevelopers = developers.filter(
    (d) => d.status === "active",
  ).length;
  const activePortals = portals.filter((p) => p.status === "active").length;
  const activeGrants = grants.filter(
    (g) =>
      g.status === "active" &&
      (!g.expiresAt || new Date(g.expiresAt) > new Date()),
  ).length;

  async function loadAll() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [d, p, a, g, au] = await Promise.all([
        request<ApiResult<Item[]>>("/api/v1/admin/developers", token),
        request<ApiResult<Item[]>>("/api/v1/admin/portals", token),
        request<ApiResult<Item[]>>("/api/v1/admin/apis", token),
        request<ApiResult<Item[]>>("/api/v1/admin/grants", token),
        request<ApiResult<Item[]>>("/api/v1/admin/audit?limit=50", token),
      ]);
      setDevelopers(d.data || []);
      setPortals(p.data || []);
      setApis(a.data || []);
      setGrants(g.data || []);
      setAudit(au.data || []);
      if (!grantApiCode && a.data?.[0]) setGrantApiCode(a.data[0].code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data");
      if (e instanceof Error && /token|identity|admin|401|403/i.test(e.message))
        logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void loadAll();
  }, [token]);

  function logout() {
    localStorage.removeItem("apiportal_admin_token");
    setToken("");
    setDevelopers([]);
    setPortals([]);
    setApis([]);
    setGrants([]);
    setAudit([]);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await request<{
        success: boolean;
        data: { accessToken: string };
      }>("/api/v1/auth/login", "", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("apiportal_admin_token", result.data.accessToken);
      setToken(result.data.accessToken);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function action(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    try {
      await fn();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function createDeveloper(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const result = await request<
        ApiResult<{ developer: Item; developerKey: string }>
      >("/api/v1/admin/developers", token, {
        method: "POST",
        body: JSON.stringify({
          companyDeveloperId: devId,
          displayName: devName,
        }),
      });
      setOneTimeKey(result.data.developerKey);
      setDevId("");
      setDevName("");
      setNotice(
        "Developer created. Copy the developer key now; it will not be shown again.",
      );
    });
  }

  async function createPortal(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const result = await request<
        ApiResult<{ portal: Item; serviceKey: string; warning: string }>
      >("/api/v1/admin/portals", token, {
        method: "POST",
        body: JSON.stringify({
          portalCode,
          name: portalName,
          environment: portalEnv,
        }),
      });
      setOneTimeKey(result.data.serviceKey);
      setPortalCode("");
      setPortalName("");
      setNotice(
        "Portal created. Copy the service key now; it will not be shown again.",
      );
    });
  }

  async function createApi(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      await request("/api/v1/admin/apis", token, {
        method: "POST",
        body: JSON.stringify({
          code: newApiCode,
          name: newApiName,
          description: newApiDescription,
          enabled: true,
          mode: "mock",
          risk: "medium",
        }),
      });
      setNewApiCode("");
      setNewApiName("");
      setNewApiDescription("");
      setNotice("API registered in mock mode.");
    });
  }

  async function createGrant(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      await request("/api/v1/admin/grants", token, {
        method: "POST",
        body: JSON.stringify({
          principalType: grantPrincipalType,
          principalId: grantPrincipalId,
          apiCode: grantApiCode,
          environment: grantEnv,
          reason: grantReason,
        }),
      });
      setGrantPrincipalId("");
      setGrantReason("");
      setNotice("Access grant saved.");
    });
  }

  async function setStatus(path: string, status: string) {
    await action(async () => {
      await request(path, token, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice(`Status updated to ${status}.`);
    });
  }

  async function revokeGrant(id: string) {
    await action(async () => {
      await request(`/api/v1/admin/grants/${id}`, token, { method: "DELETE" });
      setNotice("Grant revoked.");
    });
  }

  const nav = [
    ["overview", "Overview", LayoutDashboard],
    ["developers", "Developers", Users],
    ["portals", "Portals", AppWindow],
    ["apis", "API Registry", Database],
    ["grants", "Access Grants", ShieldCheck],
    ["audit", "Audit Logs", ScrollText],
  ] as const;

  if (!token)
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
        >
          <div className="mb-7 flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400 p-3 text-slate-950">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">ApiPortal</h1>
              <p className="text-sm text-slate-400">
                Secure API administration
              </p>
            </div>
          </div>
          {error && (
            <p className="mb-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200">
              {error}
            </p>
          )}
          <div className="space-y-4">
            <Field
              label="Admin email"
              value={email}
              onChange={setEmail}
              placeholder="admin@company.com"
            />
            <label className="block text-sm text-slate-300">
              Password
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-cyan-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
              Sign in
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Use the bootstrap admin credentials configured in backend/.env.
              This MVP is for local development only.
            </p>
          </div>
        </form>
      </main>
    );

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-800 bg-slate-950 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="rounded-xl bg-cyan-400 p-2 text-slate-950">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="font-semibold text-white">ApiPortal</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        </div>
        <nav className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${tab === key ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-8 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-xs leading-5 text-amber-200">
          <FlaskConical size={16} className="mb-1" /> Development MVP · Mock
          connector by default
        </div>
        <button
          onClick={logout}
          className="mt-5 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Control plane
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              {nav.find((n) => n[0] === tab)?.[1]}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage identities, API permissions, and access events.
            </p>
          </div>
          <button
            onClick={() => void loadAll()}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/50 p-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}
        {oneTimeKey && (
          <div className="mb-6 rounded-2xl border border-amber-800 bg-amber-950/40 p-4">
            <div className="flex items-center gap-2 font-semibold text-amber-200">
              <KeyRound size={18} /> Portal service key — shown once
            </div>
            <p className="my-2 break-all rounded-lg bg-slate-950 p-3 font-mono text-sm text-white">
              {oneTimeKey}
            </p>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(oneTimeKey);
              }}
              className="mr-3 rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950"
            >
              Copy key
            </button>
            <button
              onClick={() => setOneTimeKey("")}
              className="rounded-lg border border-amber-800 px-3 py-2 text-sm text-amber-200"
            >
              Dismiss
            </button>
          </div>
        )}
        {loading && (
          <p className="mb-4 text-sm text-slate-400">Loading data…</p>
        )}

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card
                title="Active developers"
                value={activeDevelopers}
                icon={Users}
              />
              <Card
                title="Active portals"
                value={activePortals}
                icon={AppWindow}
              />
              <Card title="Registered APIs" value={apiCount} icon={Database} />
              <Card
                title="Active grants"
                value={activeGrants}
                icon={ShieldCheck}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 font-semibold text-white">Access model</h2>
                <div className="space-y-3 text-sm text-slate-300">
                  <p className="flex gap-2">
                    <CheckCircle2
                      className="shrink-0 text-emerald-300"
                      size={17}
                    />{" "}
                    Separate developer and portal identities
                  </p>
                  <p className="flex gap-2">
                    <CheckCircle2
                      className="shrink-0 text-emerald-300"
                      size={17}
                    />{" "}
                    API-specific grants per environment
                  </p>
                  <p className="flex gap-2">
                    <CheckCircle2
                      className="shrink-0 text-emerald-300"
                      size={17}
                    />{" "}
                    HHA credentials stay server-side
                  </p>
                  <p className="flex gap-2">
                    <Ban className="shrink-0 text-amber-300" size={17} /> Live
                    SOAP operation mapping still needs company configuration
                  </p>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 font-semibold text-white">
                  Recent audit events
                </h2>
                {audit.slice(0, 6).length ? (
                  <div className="space-y-3">
                    {audit.slice(0, 6).map((a, i) => (
                      <div
                        key={a._id || i}
                        className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-slate-200">{a.action}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {a.actorType} ·{" "}
                            {a.apiCode || a.targetType || "system"}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {a.outcome}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No audit events yet.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === "developers" && (
          <div className="space-y-5">
            <form
              onSubmit={createDeveloper}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3"
            >
              <Field
                label="Company developer ID"
                value={devId}
                onChange={setDevId}
                placeholder="10s30cMH34"
              />
              <Field
                label="Display name (optional)"
                value={devName}
                onChange={setDevName}
                placeholder="Developer name"
              />
              <div className="flex items-end">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">
                  <Plus size={17} /> Add developer
                </button>
              </div>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3">Developer ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => (
                    <tr key={d._id} className="border-t border-slate-800">
                      <td className="p-3 font-mono text-slate-200">
                        {d.companyDeveloperId}
                      </td>
                      <td className="p-3">{d.displayName || "—"}</td>
                      <td className="p-3">{d.status}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              void setStatus(
                                `/api/v1/admin/developers/${d._id}/status`,
                                d.status === "active" ? "suspended" : "active",
                              )
                            }
                            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs hover:bg-slate-800"
                          >
                            {d.status === "active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            onClick={() =>
                              void action(async () => {
                                const result = await request<
                                  ApiResult<{ developerKey: string }>
                                >(
                                  `/api/v1/admin/developers/${d._id}/rotate-key`,
                                  token,
                                  { method: "POST" },
                                );
                                setOneTimeKey(result.data.developerKey);
                                setNotice(
                                  "Developer key rotated. The previous key is invalid.",
                                );
                              })
                            }
                            className="rounded-lg border border-cyan-900 px-2.5 py-1.5 text-xs text-cyan-200 hover:bg-cyan-950"
                          >
                            Rotate key
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "portals" && (
          <div className="space-y-5">
            <form
              onSubmit={createPortal}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4"
            >
              <Field
                label="Portal code"
                value={portalCode}
                onChange={setPortalCode}
                placeholder="P1"
              />
              <Field
                label="Portal name"
                value={portalName}
                onChange={setPortalName}
                placeholder="Company Portal 1"
              />
              <label className="text-sm text-slate-300">
                Environment
                <select
                  value={portalEnv}
                  onChange={(e) => setPortalEnv(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"
                >
                  <option>development</option>
                  <option>staging</option>
                  <option>production</option>
                </select>
              </label>
              <div className="flex items-end">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">
                  <Plus size={17} /> Create portal
                </button>
              </div>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Environment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portals.map((p) => (
                    <tr key={p._id} className="border-t border-slate-800">
                      <td className="p-3 font-mono">{p.portalCode}</td>
                      <td className="p-3">{p.name}</td>
                      <td className="p-3">{p.environment}</td>
                      <td className="p-3">{p.status}</td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            void setStatus(
                              `/api/v1/admin/portals/${p._id}/status`,
                              p.status === "active" ? "suspended" : "active",
                            )
                          }
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs hover:bg-slate-800"
                        >
                          {p.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "apis" && (
          <div className="space-y-5">
            <form
              onSubmit={createApi}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4"
            >
              <Field
                label="API code"
                value={newApiCode}
                onChange={setNewApiCode}
                placeholder="a1"
              />
              <Field
                label="Display name"
                value={newApiName}
                onChange={setNewApiName}
                placeholder="Patient lookup"
              />
              <Field
                label="Description"
                value={newApiDescription}
                onChange={setNewApiDescription}
                placeholder="Approved read operation"
              />
              <div className="flex items-end">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">
                  <Plus size={17} /> Register API
                </button>
              </div>
            </form>
            <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200">
              New APIs are registered in mock mode. Registration does not create
              a real HHAexchange SOAP mapping.
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {apis.map((a) => (
                    <tr key={a._id} className="border-t border-slate-800">
                      <td className="p-3 font-mono">{a.code}</td>
                      <td className="p-3">
                        {a.name}
                        <p className="text-xs text-slate-500">
                          {a.description}
                        </p>
                      </td>
                      <td className="p-3">{a.mode}</td>
                      <td className="p-3">{a.risk}</td>
                      <td className="p-3">{String(a.enabled)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "grants" && (
          <div className="space-y-5">
            <form
              onSubmit={createGrant}
              className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3"
            >
              <label className="text-sm text-slate-300">
                Identity type
                <select
                  value={grantPrincipalType}
                  onChange={(e) => {
                    setGrantPrincipalType(e.target.value);
                    setGrantPrincipalId("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"
                >
                  <option value="developer">Developer</option>
                  <option value="portal">Portal</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Identity
                <select
                  value={grantPrincipalId}
                  onChange={(e) => setGrantPrincipalId(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"
                >
                  <option value="">Select identity</option>
                  {(grantPrincipalType === "developer"
                    ? developers
                    : portals
                  ).map((item) => (
                    <option key={item._id} value={item._id}>
                      {grantPrincipalType === "developer"
                        ? item.companyDeveloperId
                        : item.portalCode}{" "}
                      — {item.displayName || item.name || item.portalCode || ""}{" "}
                      ({item.status})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                API
                <select
                  value={grantApiCode}
                  onChange={(e) => setGrantApiCode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"
                >
                  {apis.map((a) => (
                    <option key={a._id} value={a.code}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Environment
                <select
                  value={grantEnv}
                  onChange={(e) => setGrantEnv(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5"
                >
                  <option>development</option>
                  <option>staging</option>
                  <option>production</option>
                </select>
              </label>
              <Field
                label="Reason / RingCentral reference"
                value={grantReason}
                onChange={setGrantReason}
                placeholder="Approved request reference"
              />
              <div className="flex items-end">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950">
                  <ShieldCheck size={17} /> Grant access
                </button>
              </div>
            </form>
            <p className="text-xs text-slate-500">
              Select the company developer ID or portal from the list. The
              server uses the corresponding internal record ID.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-3">Identity</th>
                    <th className="p-3">API</th>
                    <th className="p-3">Environment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g._id} className="border-t border-slate-800">
                      <td className="p-3">
                        {g.principalType}
                        <p className="font-mono text-xs text-slate-500">
                          {g.principalId}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {g?.name || g?.displayName }
                        </p>
                      </td>
                      <td className="p-3 font-mono">{g.apiCode}</td>
                      <td className="p-3">{g.environment}</td>
                      <td className="p-3">{g.status}</td>
                      <td className="p-3">
                        {g.status === "active" && (
                          <button
                            onClick={() => void revokeGrant(g._id)}
                            className="rounded-lg border border-rose-900 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-950"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">API</th>
                  <th className="p-3">Environment</th>
                  <th className="p-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a._id} className="border-t border-slate-800">
                    <td className="whitespace-nowrap p-3 text-xs text-slate-400">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      {a.actorType}
                      <p className="font-mono text-xs text-slate-500">
                        {a.actorId}
                      </p>
                    </td>
                    <td className="p-3">{a.action}</td>
                    <td className="p-3 font-mono">{a.apiCode || "—"}</td>
                    <td className="p-3">{a.environment || "—"}</td>
                    <td className="p-3">{a.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500">
          <span>ApiPortal · Secure API access control</span>
          <span className="flex items-center gap-1">
            <Activity size={13} /> Mock mode until configured
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;

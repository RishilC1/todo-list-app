import { useEffect, useState } from "react";
import { api } from "./api";

type Category = "WORK" | "PERSONAL";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string | null;
  category: Category;
};

type AccountSummary = {
  email: string;
  createdAt: string;
  activeCount: number;
  completedCount: number;
};

function formatDate(dt?: string | null) {
  if (!dt) return "";
  return new Date(dt).toLocaleString();
}

export default function App() {
  // ---------- Auth ----------
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  // ---------- Tasks ----------
  const [active, setActive] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [tab, setTab] = useState<"active" | "completed">("active");

  // Category filtering and selection
  const [catFilter, setCatFilter] = useState<"ALL" | Category>("ALL");
  const [newCat, setNewCat] = useState<Category>("PERSONAL");

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingCat, setEditingCat] = useState<Category>("PERSONAL");

  // Account modal
  const [showAcct, setShowAcct] = useState(false);
  const [acct, setAcct] = useState<AccountSummary | null>(null);
  const [acctLoading, setAcctLoading] = useState(false);

  async function loadLists() {
    const q = (completed: boolean) => {
      const params = new URLSearchParams({ completed: String(completed) });
      if (catFilter !== "ALL") params.set("category", catFilter);
      return params.toString();
    };
    const [a, c] = await Promise.all([
      api.get(`tasks?${q(false)}`).json<Task[]>(),
      api.get(`tasks?${q(true)}`).json<Task[]>(),
    ]);
    setActive(a);
    setCompleted(c);
    setAuthed(true);
  }

  useEffect(() => {
    fetch("http://localhost:4000/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => loadLists())
      .catch(() => setAuthed(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authed) loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catFilter]);

  // ---------- Auth actions ----------
  async function signin() {
    setMsg(null);
    const res = await fetch("http://localhost:4000/api/auth/signin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMsg((body as any)?.message || "Internal error");
      return;
    }
    await loadLists();
  }

  async function signup() {
    setMsg(null);
    const res = await fetch("http://localhost:4000/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMsg((body as any)?.message || "Internal error");
      return;
    }
    await loadLists();
  }

  async function signout() {
    await fetch("http://localhost:4000/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });
    setAuthed(false);
    setActive([]);
    setCompleted([]);
    setEmail("");
    setPwd("");
    setMode("signin");
  }

  // ---------- Tasks actions ----------
  async function addTask() {
    const t = title.trim();
    if (!t) return;
    try {
      const newTask = await api
        .post("tasks", { json: { title: t, category: newCat } })
        .json<Task>();
      if (catFilter === "ALL" || catFilter === newTask.category) {
        setActive([newTask, ...active]);
      }
      setTitle("");
      setNewCat("PERSONAL");
      if (tab !== "active") setTab("active");
    } catch (e: any) {
      setMsg(e?.message || "Failed to add task");
    }
  }

  function beginEdit(t: Task) {
    setEditingId(t.id);
    setEditingTitle(t.title);
    setEditingCat(t.category);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }
  async function saveEdit(t: Task) {
    const nt = editingTitle.trim();
    const patch: Partial<Pick<Task, "title" | "category">> = {};
    if (nt && nt !== t.title) patch.title = nt;
    if (editingCat !== t.category) patch.category = editingCat;
    if (!Object.keys(patch).length) {
      cancelEdit();
      return;
    }
    const updated = await api.patch(`tasks/${t.id}`, { json: patch }).json<Task>();

    const applyUpdate = (arr: Task[]) => arr.map((x) => (x.id === t.id ? updated : x));

    if (!t.done) {
      let next = applyUpdate(active);
      if (catFilter !== "ALL" && updated.category !== catFilter) {
        next = next.filter((x) => x.id !== t.id);
      }
      setActive(next);
    } else {
      let next = applyUpdate(completed);
      if (catFilter !== "ALL" && updated.category !== catFilter) {
        next = next.filter((x) => x.id !== t.id);
      }
      setCompleted(next);
    }
    cancelEdit();
  }

  async function toggle(task: Task, from: "active" | "completed") {
    const updated = await api
      .patch(`tasks/${task.id}`, { json: { done: !task.done } })
      .json<Task>();
    if (from === "active") {
      setActive(active.filter((x) => x.id !== task.id));
      if (catFilter === "ALL" || updated.category === catFilter) {
        setCompleted([updated, ...completed]);
      }
    } else {
      setCompleted(completed.filter((x) => x.id !== task.id));
      if (catFilter === "ALL" || updated.category === catFilter) {
        setActive([updated, ...active]);
      }
    }
  }

  async function remove(task: Task, from: "active" | "completed") {
    await api.delete(`tasks/${task.id}`).json();
    if (from === "active") setActive(active.filter((x) => x.id !== task.id));
    else setCompleted(completed.filter((x) => x.id !== task.id));
  }

  // ---------- Account modal ----------
  async function openAccount() {
    setShowAcct(true);
    setAcctLoading(true);
    try {
      const data = await api.get("account").json<AccountSummary>();
      setAcct(data);
    } catch (e: any) {
      setMsg(e?.message || "Failed to load account");
    } finally {
      setAcctLoading(false);
    }
  }

  // ---------- AUTH VIEW ----------
  if (!authed) {
    return (
      <div className="auth-min">
        <div className="auth-box">
          <h1 className="brand">Taskanizer</h1>

          {msg && <p className="auth-error">{msg}</p>}

          <input
            className="auth-input"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="password"
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (mode === "signin" ? signin() : signup())
            }
          />

          {mode === "signin" ? (
            <>
              <button className="auth-button" onClick={signin}>
                Sign in
              </button>
              <p className="auth-switch">
                Don’t have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signup");
                    setMsg(null);
                  }}
                >
                  sign up
                </a>
              </p>
            </>
          ) : (
            <>
              <button className="auth-button" onClick={signup}>
                Sign up
              </button>
              <p className="auth-switch">
                Already have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signin");
                    setMsg(null);
                  }}
                >
                  sign in
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- TASKS VIEW ----------
  const list = tab === "active" ? active : completed;

  return (
    <div className="app-shell">
      <div className="tasks-card">
        <div className="app-header">
          <h2 className="title">Tasks</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={openAccount}>Account</button>
            <button className="btn" onClick={signout}>Sign out</button>
          </div>
        </div>

        {/* Category filter */}
        <div className="filters" style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>Category:</span>
            <select
              className="input"
              style={{ width: 180 }}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as any)}
            >
              <option value="ALL">All</option>
              <option value="WORK">Work</option>
              <option value="PERSONAL">Personal</option>
            </select>
          </label>
        </div>

        <div className="tabs">
          <button
            className={`tab ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
          >
            Active ({active.length})
          </button>
          <button
            className={`tab ${tab === "completed" ? "active" : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed ({completed.length})
          </button>
        </div>

        {tab === "active" && (
          <div className="add">
            <input
              className="input"
              placeholder="New task..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <select
              className="input"
              style={{ width: 160 }}
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as Category)}
            >
              <option value="PERSONAL">Personal</option>
              <option value="WORK">Work</option>
            </select>
            <button className="btn primary" onClick={addTask}>Add</button>
          </div>
        )}

        <ul className="list">
          {list.map((t) => {
            const from = tab;
            const isEditing = editingId === t.id;
            return (
              <li key={t.id} className="item">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggle(t, from)}
                  title={from === "active" ? "Complete task" : "Mark as active"}
                />

                {!isEditing ? (
                  <div className="task-main">
                    <div className="item-title">{t.title}</div>
                    <div className="meta">
                      <span>{t.category === "WORK" ? "Work" : "Personal"}</span>
                      <span> • Created: {formatDate(t.createdAt)}</span>
                      {t.completedAt && (
                        <span> • Completed: {formatDate(t.completedAt)}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="task-edit" style={{ display: "grid", gap: 6, flex: 1 }}>
                    <input
                      className="input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(t)}
                      autoFocus
                    />
                    <select
                      className="input"
                      value={editingCat}
                      onChange={(e) => setEditingCat(e.target.value as Category)}
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="WORK">Work</option>
                    </select>
                  </div>
                )}

                {!isEditing ? (
                  <>
                    <button className="btn" onClick={() => beginEdit(t)}>Edit</button>
                    <button className="btn danger" onClick={() => remove(t, from)}>Delete</button>
                  </>
                ) : (
                  <>
                    <button className="btn primary" onClick={() => saveEdit(t)}>Save</button>
                    <button className="btn" onClick={cancelEdit}>Cancel</button>
                  </>
                )}
              </li>
            );
          })}
          {list.length === 0 && <li className="empty">No tasks here yet.</li>}
        </ul>

        {/* Account modal */}
        {showAcct && (
          <div className="overlay" onClick={() => setShowAcct(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Account</h3>
                <button className="btn" onClick={() => setShowAcct(false)}>Close</button>
              </div>

              <div style={{ marginTop: 12 }}>
                {acctLoading && <p className="meta">Loading…</p>}
                {!acctLoading && acct && (
                  <ul className="account-list">
                    <li><strong>Email:</strong> {acct.email}</li>
                    <li><strong>Created:</strong> {new Date(acct.createdAt).toLocaleString()}</li>
                    <li><strong>Active tasks:</strong> {acct.activeCount}</li>
                    <li><strong>Completed tasks:</strong> {acct.completedCount}</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

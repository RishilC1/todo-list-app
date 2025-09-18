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

  // ---------- Tabs ----------
  const [statusTab, setStatusTab] = useState<"active" | "completed">("active");
  const [catTab, setCatTab] = useState<Category>("PERSONAL");

  // ---------- Tasks ----------
  const [active, setActive] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  // ---------- Editing ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // ---------- Info modal ----------
  const [infoTask, setInfoTask] = useState<Task | null>(null);

  // ---------- Account modal ----------
  const [showAcct, setShowAcct] = useState(false);
  const [acct, setAcct] = useState<AccountSummary | null>(null);
  const [acctLoading, setAcctLoading] = useState(false);

  async function loadLists() {
    const q = (isCompleted: boolean) => {
      const params = new URLSearchParams({
        completed: String(isCompleted),
        category: catTab,
      });
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
  }, [catTab]);

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
        .post("tasks", { json: { title: t, category: catTab } })
        .json<Task>();
      if (statusTab === "active") setActive([newTask, ...active]);
      setTitle("");
      setStatusTab("active");
    } catch (e: any) {
      setMsg(e?.message || "Failed to add task");
    }
  }

  function beginEdit(t: Task) {
    setEditingId(t.id);
    setEditingTitle(t.title);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }
  async function saveEdit(t: Task) {
    const nt = editingTitle.trim();
    if (!nt || nt === t.title) {
      cancelEdit();
      return;
    }
    const updated = await api
      .patch(`tasks/${t.id}`, { json: { title: nt } })
      .json<Task>();

    if (!t.done) {
      setActive(active.map((x) => (x.id === t.id ? updated : x)));
    } else {
      setCompleted(completed.map((x) => (x.id === t.id ? updated : x)));
    }
    cancelEdit();
  }

  async function toggle(task: Task, from: "active" | "completed") {
    const updated = await api
      .patch(`tasks/${task.id}`, { json: { done: !task.done } })
      .json<Task>();
    if (from === "active") {
      setActive(active.filter((x) => x.id !== task.id));
      setCompleted([updated, ...completed]);
    } else {
      setCompleted(completed.filter((x) => x.id !== task.id));
      setActive([updated, ...active]);
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
  const list = statusTab === "active" ? active : completed;

  return (
    <div className="app-shell">
      <div className="tasks-card">
        <div className="app-header">
          <h2 className="title">Tasks</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <button className="profile-btn" onClick={openAccount} title="Account">
    <div className="avatar-icon">
      <div className="avatar-head"></div>
      <div className="avatar-body"></div>
    </div>
  </button>
  <button className="btn" onClick={signout}>Sign out</button>
</div>

        </div>

        {/* Status Tabs */}
        <div className="tabs" style={{ marginTop: 14 }}>
          <button
            className={`tab ${statusTab === "active" ? "active" : ""}`}
            onClick={() => setStatusTab("active")}
          >
            Active
          </button>
          <button
            className={`tab ${statusTab === "completed" ? "active" : ""}`}
            onClick={() => setStatusTab("completed")}
          >
            Completed
          </button>
        </div>

        {/* Category Tabs */}
        <div className="tabs" style={{ marginTop: 10 }}>
          <button
            className={`tab ${catTab === "WORK" ? "active" : ""}`}
            onClick={() => setCatTab("WORK")}
          >
            Work
          </button>
          <button
            className={`tab ${catTab === "PERSONAL" ? "active" : ""}`}
            onClick={() => setCatTab("PERSONAL")}
          >
            Personal
          </button>
        </div>

        {/* Add box */}
        {statusTab === "active" && (
          <div className="add">
            <input
              className="input"
              placeholder={`New ${catTab === "WORK" ? "work" : "personal"} task…`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <button className="btn primary" onClick={addTask}>Add</button>
          </div>
        )}

        <ul className="list">
          {list.map((t) => {
            const from = statusTab;
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
                  </div>
                )}

                <div className="actions">
                  {!isEditing ? (
                    <>
                      {/* Info */}
                      <button
                        className="icon-btn info"
                        onClick={() => setInfoTask(t)}
                        title="Info"
                        aria-label="Task info"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="8" r="1.25" fill="currentColor"/>
                          <path d="M11.25 11h1.5v6h-1.5z" fill="currentColor"/>
                        </svg>
                      </button>

                      {/* Edit (pencil) */}
                      <button
                        className="icon-btn edit"
                        onClick={() => beginEdit(t)}
                        title="Edit"
                        aria-label="Edit task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                          <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.34 1.34 3.75 3.75 1.34-1.35z" fill="currentColor"/>
                        </svg>
                      </button>

                      {/* Delete (real trash can) */}
                      <button
                        className="icon-btn delete"
                        onClick={() => remove(t, from)}
                        title="Delete"
                        aria-label="Delete task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M9 3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <rect x="6.5" y="7" width="11" height="12" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                          <path d="M10 10v6M14 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn primary" onClick={() => saveEdit(t)}>Save</button>
                      <button className="btn" onClick={cancelEdit}>Cancel</button>
                    </>
                  )}
                </div>
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

        {/* Task info modal */}
        {infoTask && (
          <div className="overlay" onClick={() => setInfoTask(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Task Info</h3>
                <button className="btn" onClick={() => setInfoTask(null)}>Close</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <ul className="account-list">
                  <li><strong>Created:</strong> {formatDate(infoTask.createdAt)}</li>
                  {infoTask.completedAt && (
                    <li><strong>Completed:</strong> {formatDate(infoTask.completedAt)}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "./api";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;            // comes from backend
  completedAt?: string | null;  // null if not completed
};

function formatDate(dt?: string | null) {
  if (!dt) return "";
  return new Date(dt).toLocaleString();
}

export default function App() {
  /** ---------- Auth state ---------- */
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);

  /** ---------- Task state ---------- */
  const [active, setActive] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [tab, setTab] = useState<"active" | "completed">("active");

  /** ---------- Editing state ---------- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  /** ---------- Helpers ---------- */
  async function loadLists() {
    const [a, c] = await Promise.all([
      api.get("tasks?completed=false").json<Task[]>(),
      api.get("tasks?completed=true").json<Task[]>(),
    ]);
    setActive(a);
    setCompleted(c);
    setAuthed(true);
  }

  useEffect(() => {
    // try existing session
    fetch("http://localhost:4000/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => loadLists())
      .catch(() => setAuthed(false));
  }, []);

  /** ---------- Auth actions ---------- */
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
      setMsg(body?.message || "Internal error");
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
      setMsg(body?.message || "Internal error");
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

  /** ---------- Task actions ---------- */
  async function addTask() {
    if (!title.trim()) return;
    const t = await api.post("tasks", { json: { title } }).json<Task>();
    setActive([t, ...active]);
    setTitle("");
    if (tab !== "active") setTab("active");
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
    if (!t.done) setActive(active.map((x) => (x.id === t.id ? updated : x)));
    else setCompleted(completed.map((x) => (x.id === t.id ? updated : x)));
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

  /** =====================================================================
   *  AUTH JSX (shown when not authenticated)
   * ===================================================================== */
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

  /** =====================================================================
   *  TASKS JSX (shown when authenticated)
   * ===================================================================== */
  const list = tab === "active" ? active : completed;

  return (
    <div className="app-shell">
      <div className="tasks-card">
        <div className="app-header">
          <h2 className="title">Tasks</h2>
          <button className="btn" onClick={signout}>
            Sign out
          </button>
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
            <button className="btn primary" onClick={addTask}>
              Add
            </button>
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
                      <span>Created: {formatDate(t.createdAt)}</span>
                      {t.completedAt && (
                        <span> • Completed: {formatDate(t.completedAt)}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="task-edit">
                    <input
                      className="input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(t)}
                      autoFocus
                    />
                  </div>
                )}

                {!isEditing ? (
                  <>
                    <button className="btn" onClick={() => beginEdit(t)}>
                      Edit
                    </button>
                    <button className="btn danger" onClick={() => remove(t, from)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn primary" onClick={() => saveEdit(t)}>
                      Save
                    </button>
                    <button className="btn" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {list.length === 0 && <li className="empty">No tasks here yet.</li>}
        </ul>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

type Category = "WORK" | "PERSONAL";

type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string | null;
  dueDate?: string | null;
  category: Category;
  // accept either field name to survive schema/client drift
  sortIndex?: number;
  order?: number;
};

type AccountSummary = {
  email: string;
  createdAt: string;
  activeCount: number;
  completedCount: number;
};

function formatDate(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function App() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    return () => document.body.classList.remove("dark");
  }, [dark]);

  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [statusTab, setStatusTab] = useState<"active" | "completed">("active");
  const [catTab, setCatTab] = useState<Category>("PERSONAL");

  const [tasks, setTasks] = useState<Task[]>([]);
  const activeTasks = useMemo(() => tasks.filter(t => !t.done), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.done), [tasks]);
  const currentList = statusTab === "active" ? activeTasks : completedTasks;

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(""); // yyyy-mm-dd
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [infoTask, setInfoTask] = useState<Task | null>(null);
  const [showAcct, setShowAcct] = useState(false);
  const [acct, setAcct] = useState<AccountSummary | null>(null);
  const [acctLoading, setAcctLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:4000/api/auth/me", { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  async function loadTasks() {
    const qs = new URLSearchParams({
      completed: String(statusTab === "completed"),
      category: catTab,
    }).toString();
    const data = await api.get(`tasks?${qs}`).json<Task[]>();
    // normalize: ensure we always have sortIndex on the client
    const normalized = data.map(t => ({
      ...t,
      sortIndex: typeof t.sortIndex === "number" ? t.sortIndex : t.order ?? 0,
    }));
    setTasks(normalized);
  }
  useEffect(() => {
    if (authed) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, statusTab, catTab]);

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
    setAuthed(true);
    await loadTasks();
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
    setAuthed(true);
    await loadTasks();
  }

  async function signout() {
    await fetch("http://localhost:4000/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });
    setAuthed(false);
    setTasks([]);
    setEmail("");
    setPwd("");
    setMode("signin");
  }

  async function addTask() {
    const t = title.trim();
    if (!t) return;
    const payload: any = { title: t, category: catTab };
    if (dueDate) payload.dueDate = new Date(dueDate).toISOString();
    const created = await api.post("tasks", { json: payload }).json<Task>();
    setTasks(prev => [
      ...prev,
      { ...created, sortIndex: (created as any).sortIndex ?? (created as any).order ?? prev.length },
    ]);
    setTitle("");
    setDueDate("");
    setStatusTab("active");
  }

  function beginEdit(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
  }
  async function saveEdit(task: Task) {
    const nt = editingTitle.trim();
    if (!nt || nt === task.title) {
      cancelEdit();
      return;
    }
    const updated = await api.patch(`tasks/${task.id}`, { json: { title: nt } }).json<Task>();
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...updated } : t)));
    cancelEdit();
  }

  async function toggle(task: Task) {
    const updated = await api
      .patch(`tasks/${task.id}`, { json: { done: !task.done } })
      .json<Task>();
    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...updated } : t)));
  }

  async function remove(task: Task) {
    await api.delete(`tasks/${task.id}`).json();
    setTasks(prev => prev.filter(t => t.id !== task.id));
  }

  // Drag & drop: send { order } to server (it maps to sortIndex)
  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;

    const idsInCurrent = currentList.map(t => t.id);
    if (src === dst) return;

    setTasks(prev => {
      const copy = [...prev];

      const indices = copy
        .map((t, i) => ({ id: t.id, i }))
        .filter(x => idsInCurrent.includes(x.id))
        .map(x => x.i);

      const visible = indices.map(i => copy[i]);
      const [moved] = visible.splice(src, 1);
      visible.splice(dst, 0, moved);

      visible.forEach((t, idx) => {
        const gi = indices[idx];
        copy[gi] = { ...t, sortIndex: idx };
      });

      visible.forEach((t, idx) => {
        api.patch(`tasks/${t.id}`, { json: { order: idx } }).catch(() => {});
      });

      return copy;
    });
  }

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
          <div style={{ display: "flex", gap: 10 }}>
            <button className="auth-button" onClick={() => setDark(d => !d)}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            {mode === "signin" ? (
              <button className="auth-button" onClick={signin}>Sign in</button>
            ) : (
              <button className="auth-button" onClick={signup}>Sign up</button>
            )}
          </div>
          {mode === "signin" ? (
            <p className="auth-switch">
              Don’t have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setMsg(null); }}>
                sign up
              </a>
            </p>
          ) : (
            <p className="auth-switch">
              Already have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setMsg(null); }}>
                sign in
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

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
            <button className="btn" onClick={() => setDark(d => !d)}>
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
            <button className="btn" onClick={signout}>Sign out</button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${statusTab === "active" ? "active" : ""}`} onClick={() => setStatusTab("active")}>
            Active
          </button>
          <button className={`tab ${statusTab === "completed" ? "active" : ""}`} onClick={() => setStatusTab("completed")}>
            Completed
          </button>
        </div>

        <div className="tabs">
          <button className={`tab ${catTab === "WORK" ? "active" : ""}`} onClick={() => setCatTab("WORK")}>
            Work
          </button>
          <button className={`tab ${catTab === "PERSONAL" ? "active" : ""}`} onClick={() => setCatTab("PERSONAL")}>
            Personal
          </button>
        </div>

        {statusTab === "active" && (
          <div className="add">
            <input
              className="input"
              placeholder={`New ${catTab === "WORK" ? "work" : "personal"} task…`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              title="Due date"
            />
            <button className="btn primary" onClick={addTask}>Add</button>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tasks-droppable">
            {(dropProvided) => (
              <ul className="list" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {currentList.map((t, idx) => (
                  <Draggable draggableId={t.id} index={idx} key={t.id}>
                    {(dragProvided) => (
                      <li
                        className="item"
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                      >
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggle(t)}
                          title={t.done ? "Mark as active" : "Complete task"}
                        />

                        {editingId !== t.id ? (
                          <div className="task-main">
                            <div className="item-title">{t.title}</div>
                            <div className="meta">
                              {t.dueDate ? `⏰ Due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}
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
                          </div>
                        )}

                        <div className="actions">
                          {editingId !== t.id ? (
                            <>
                              <button className="icon-btn info" onClick={() => setInfoTask(t)} title="Info" aria-label="Task info">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
                                  <circle cx="12" cy="8" r="1.25" fill="currentColor"/>
                                  <path d="M11.25 11h1.5v6h-1.5z" fill="currentColor"/>
                                </svg>
                              </button>
                              <button className="icon-btn edit" onClick={() => beginEdit(t)} title="Edit" aria-label="Edit task">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                                  <path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.3a1 1 0 0 0-1.41 0l-1.34 1.34 3.75 3.75 1.34-1.35z" fill="currentColor"/>
                                </svg>
                              </button>
                              <button className="icon-btn delete" onClick={() => remove(t)} title="Delete" aria-label="Delete task">
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
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
                {currentList.length === 0 && <li className="empty">No tasks here yet.</li>}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

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
                  {infoTask.dueDate && <li><strong>Due:</strong> {formatDate(infoTask.dueDate)}</li>}
                  {infoTask.completedAt && <li><strong>Completed:</strong> {formatDate(infoTask.completedAt)}</li>}
                  <li><strong>Category:</strong> {infoTask.category === "WORK" ? "Work" : "Personal"}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

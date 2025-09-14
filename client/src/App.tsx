import { useEffect, useState } from "react";
import { api } from "./api";

type Task = { id: string; title: string; done: boolean };

export default function App() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState<Task[]>([]);
  const [completed, setCompleted] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "completed">("active");

  async function load() {
    setMsg(null);
    try {
      const [a, c] = await Promise.all([
        api.get("tasks?completed=false").json<Task[]>(),
        api.get("tasks?completed=true").json<Task[]>()
      ]);
      setActive(a);
      setCompleted(c);
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSignup() {
    setMsg(null);
    try {
      const res = await fetch("http://localhost:4000/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Signup failed (${res.status})`);
      }
      setMsg("Signed up! You are now logged in.");
      await load();
    } catch (e: any) {
      setMsg(e.message || "Signup failed");
    }
  }

  async function handleSignin() {
    setMsg(null);
    try {
      const res = await fetch("http://localhost:4000/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Signin failed (${res.status})`);
      }
      setMsg("Signed in!");
      await load();
    } catch (e: any) {
      setMsg(e.message || "Signin failed");
    }
  }

  async function signout() {
    setMsg(null);
    await fetch("http://localhost:4000/api/auth/signout", {
      method: "POST",
      credentials: "include"
    });
    setAuthed(false);
    setActive([]);
    setCompleted([]);
  }

  async function addTask() {
    setMsg(null);
    if (!title.trim()) return;
    try {
      const t = await api.post("tasks", { json: { title } }).json<Task>();
      setActive([t, ...active]);
      setTitle("");
      if (tab !== "active") setTab("active");
    } catch {
      setMsg("Failed to add task (are you signed in?)");
    }
  }

  async function toggle(task: Task, from: "active" | "completed") {
    const updated = await api
      .patch(`tasks/${task.id}`, { json: { done: !task.done } })
      .json<Task>();

    if (from === "active") {
      // move to completed
      setActive(active.filter((x) => x.id !== task.id));
      setCompleted([updated, ...completed]);
    } else {
      // move to active
      setCompleted(completed.filter((x) => x.id !== task.id));
      setActive([updated, ...active]);
    }
  }

  async function remove(task: Task, from: "active" | "completed") {
    await api.delete(`tasks/${task.id}`).json();
    if (from === "active") {
      setActive(active.filter((x) => x.id !== task.id));
    } else {
      setCompleted(completed.filter((x) => x.id !== task.id));
    }
  }

  if (!authed) {
    return (
      <div style={{ maxWidth: 380, margin: "4rem auto", display: "grid", gap: 8 }}>
        <h2>Welcome</h2>
        {msg && <div style={{ color: "crimson" }}>{msg}</div>}
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="password (min 8)" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSignup}>Sign up</button>
          <button onClick={handleSignin}>Sign in</button>
        </div>
      </div>
    );
  }

  const list = tab === "active" ? active : completed;

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Tasks</h2>
        <button onClick={signout}>Sign out</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          onClick={() => setTab("active")}
          style={{ fontWeight: tab === "active" ? 700 : 400 }}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          style={{ fontWeight: tab === "completed" ? 700 : 400 }}
        >
          Completed ({completed.length})
        </button>
      </div>

      {/* Add only visible on Active tab */}
      {tab === "active" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="New task..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={addTask}>Add</button>
        </div>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {list.map((t) => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t, tab)}
              title={tab === "active" ? "Complete task" : "Mark as active"}
            />
            <span style={{ textDecoration: t.done ? "line-through" : "none", flex: 1 }}>
              {t.title}
            </span>
            <button onClick={() => remove(t, tab)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

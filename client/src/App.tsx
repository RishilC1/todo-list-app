import { useEffect, useState } from "react";
import { api } from "./api";

type Task = { id: string; title: string; done: boolean };

export default function App() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  async function load() {
    try {
      const data: Task[] = await api.get("tasks").json();
      setTasks(data);
      setAuthed(true);
    } catch {
      setAuthed(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSignup() {
    await fetch("http://localhost:4000/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd })
    });
    await load();
  }

  async function handleSignin() {
    await fetch("http://localhost:4000/api/auth/signin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pwd })
    });
    await load();
  }

  async function addTask() {
    if (!title.trim()) return;
    const t = await api.post("tasks", { json: { title }}).json<Task>();
    setTasks([t, ...tasks]);
    setTitle("");
  }

  async function toggle(task: Task) {
    const updated = await api.patch(`tasks/${task.id}`, { json: { done: !task.done }}).json<Task>();
    setTasks(tasks.map(x => x.id === task.id ? updated : x));
  }

  async function remove(task: Task) {
    await api.delete(`tasks/${task.id}`).json();
    setTasks(tasks.filter(x => x.id !== task.id));
  }

  if (!authed) {
    return (
      <div className="container" style={{ display: "grid", gap: 8 }}>
        <h2>Welcome</h2>
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSignup}>Sign up</button>
          <button onClick={handleSignin}>Sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Tasks</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="New task..." value={title} onChange={e => setTitle(e.target.value)} />
        <button onClick={addTask}>Add</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map(t => (
          <li key={t.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
            <span style={{ textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.title}</span>
            <button onClick={() => remove(t)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

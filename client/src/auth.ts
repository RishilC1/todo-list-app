export async function signup(email: string, password: string) {
  const res = await fetch("http://localhost:4000/api/auth/signup", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Signup failed");
}

export async function signin(email: string, password: string) {
  const res = await fetch("http://localhost:4000/api/auth/signin", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Signin failed");
}

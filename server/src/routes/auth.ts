import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

const creds = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function setTokenCookie(res: any, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(process.env.COOKIE_NAME || "token", token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function requireSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

r.post("/signup", async (req, res) => {
  try {
    const parsed = creds.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const { email, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    const token = jwt.sign({ sub: user.id }, requireSecret(), { expiresIn: "7d" });
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ message: "Email already in use" });
    res.status(500).json({ message: "Internal error (signup)" });
  }
});

r.post("/signin", async (req, res) => {
  try {
    const parsed = creds.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ sub: user.id }, requireSecret(), { expiresIn: "7d" });
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email });
  } catch {
    res.status(500).json({ message: "Internal error (signin)" });
  }
});

r.get("/me", async (req: any, res) => {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || "token"];
    if (!token) return res.status(401).json({ message: "Unauthenticated" });
    const payload = jwt.verify(token, requireSecret()) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true } });
    if (!user) return res.status(401).json({ message: "Unauthenticated" });
    res.json(user);
  } catch {
    res.status(401).json({ message: "Unauthenticated" });
  }
});

r.post("/signout", (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "token");
  res.json({ ok: true });
});

r.head("/exists", async (req, res) => {
  const email = String(req.query.email || "");
  if (!email) return res.sendStatus(400);
  const found = await prisma.user.findUnique({ where: { email } });
  res.sendStatus(found ? 204 : 404);
});

export default r;

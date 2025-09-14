import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function setTokenCookie(res: any, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(process.env.COOKIE_NAME || "token", token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd
  });
}

r.post("/signup", async (req, res) => {
  try {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const { email, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing at signup");
      return res.status(500).json({ message: "Server misconfigured" });
    }
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email });
  } catch (e) {
    console.error("signup error:", e);
    res.status(500).json({ message: "Internal error" });
  }
});

r.post("/signin", async (req, res) => {
  try {
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET missing at signin");
      return res.status(500).json({ message: "Server misconfigured" });
    }
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email });
  } catch (e) {
    console.error("signin error:", e);
    res.status(500).json({ message: "Internal error" });
  }
});

r.post("/signout", (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "token");
  res.json({ ok: true });
});

export default r;

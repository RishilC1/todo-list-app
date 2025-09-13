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
  const parse = credsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);
  const { email, password } = parse.data;

  const exists = await prisma.user.findUnique({ where: { email }});
  if (exists) return res.status(409).json({ message: "Email in use" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashed }});

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  setTokenCookie(res, token);
  res.json({ id: user.id, email: user.email });
});

r.post("/signin", async (req, res) => {
  const parse = credsSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);
  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email }});
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  setTokenCookie(res, token);
  res.json({ id: user.id, email: user.email });
});

r.post("/signout", (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "token");
  res.json({ ok: true });
});

export default r;

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

function requireUser(req: any, res: any, next: any) {
  const token = req.cookies?.[process.env.COOKIE_NAME || "token"];
  if (!token) return res.status(401).json({ message: "Unauthenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    (req as any).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Unauthenticated" });
  }
}

const taskSchema = z.object({ title: z.string().min(1) });

r.use(requireUser);

r.get("/", async (req: any, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json(tasks);
});

r.post("/", async (req: any, res) => {
  const parse = taskSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);
  const task = await prisma.task.create({
    data: { title: parse.data.title, userId: req.userId }
  });
  res.json(task);
});

r.patch("/:id", async (req: any, res) => {
  const { id } = req.params;
  const { title, done } = req.body as { title?: string; done?: boolean };
  const task = await prisma.task.update({ where: { id }, data: { title, done }});
  res.json(task);
});

r.delete("/:id", async (req: any, res) => {
  const { id } = req.params;
  await prisma.task.delete({ where: { id }});
  res.json({ ok: true });
});

export default r;

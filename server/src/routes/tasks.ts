import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

type AuthedReq = { userId?: string; params: any; query: any; body: any };

const createTask = z.object({ title: z.string().trim().min(1) });
const updateTask = z.object({
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
});

r.get("/", async (req: AuthedReq, res) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });
  const completed = req.query.completed === "true";
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId, done: completed },
    orderBy: [{ createdAt: "desc" }],
  });
  res.json(tasks);
});

r.post("/", async (req: AuthedReq, res) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });
  const parsed = createTask.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const t = await prisma.task.create({
    data: { title: parsed.data.title, userId: req.userId },
  });
  res.json(t);
});

r.patch("/:id", async (req: AuthedReq, res) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });
  const parsed = updateTask.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const id = String(req.params.id);

  // ensure task belongs to this user
  const existing = await prisma.task.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

  const data: any = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.done !== undefined) {
    data.done = parsed.data.done;
    data.completedAt = parsed.data.done ? new Date() : null;
  }

  const updated = await prisma.task.update({ where: { id }, data });
  res.json(updated);
});

r.delete("/:id", async (req: AuthedReq, res) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });
  const id = String(req.params.id);

  const existing = await prisma.task.findFirst({
    where: { id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

  await prisma.task.delete({ where: { id } });
  res.json({ ok: true });
});

export default r;

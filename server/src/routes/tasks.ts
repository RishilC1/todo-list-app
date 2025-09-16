import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

// augment request with userId set by requireAuth
type ReqU<TParams = any, TResBody = any, TReqBody = any, TQuery = any> =
  Request<TParams, TResBody, TReqBody, TQuery> & { userId?: string };

// string union for category (avoid importing Prisma enum)
type CategoryStr = "WORK" | "PERSONAL";

const createTask = z.object({
  title: z.string().trim().min(1),
  category: z.enum(["WORK", "PERSONAL"]).optional(),
});

const updateTask = z.object({
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
  category: z.enum(["WORK", "PERSONAL"]).optional(),
});

// GET /api/tasks?completed=true|false&category=WORK|PERSONAL
r.get(
  "/",
  async (req: ReqU<any, any, any, { completed?: string; category?: string }>, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

    const completed = req.query.completed === "true";
    const cat = req.query.category as CategoryStr | undefined;
    const where: any = { userId: req.userId, done: completed };
    if (cat === "WORK" || cat === "PERSONAL") where.category = cat;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });
    res.json(tasks);
  }
);

// POST /api/tasks
r.post("/", async (req: ReqU<any, any, { title: string; category?: CategoryStr }>, res: Response) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

  const parsed = createTask.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

  const category: CategoryStr = parsed.data.category === "WORK" ? "WORK" : "PERSONAL";

  // use `any` for data to avoid type issues if Prisma client is stale
  const t = await prisma.task.create({
    data: {
      title: parsed.data.title,
      userId: req.userId,
      category,
    } as any,
  });

  res.json(t);
});

// PATCH /api/tasks/:id
r.patch(
  "/:id",
  async (
    req: ReqU<{ id: string }, any, { title?: string; done?: boolean; category?: CategoryStr }>,
    res: Response
  ) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

    const parsed = updateTask.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const id = String(req.params.id);

    const existing = await prisma.task.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ message: "Not found" });

    const data: any = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.done !== undefined) {
      data.done = parsed.data.done;
      data.completedAt = parsed.data.done ? new Date() : null;
    }

    const updated = await prisma.task.update({ where: { id }, data });
    res.json(updated);
  }
);

// DELETE /api/tasks/:id
r.delete("/:id", async (req: ReqU<{ id: string }>, res: Response) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

  const id = String(req.params.id);
  const existing = await prisma.task.findFirst({ where: { id, userId: req.userId } });
  if (!existing) return res.status(404).json({ message: "Not found" });

  await prisma.task.delete({ where: { id } });
  res.json({ ok: true });
});

export default r;

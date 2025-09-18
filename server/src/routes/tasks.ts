import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();
const r = Router();

type ReqU<T = any, B = any, Q = any> = Request<T, any, B, Q> & { userId?: string };

const createTask = z.object({
  title: z.string().trim().min(1),
  category: z.enum(["WORK", "PERSONAL"]).optional(),
  dueDate: z.string().optional(), // ISO date string
});

const updateTask = z.object({
  title: z.string().trim().min(1).optional(),
  done: z.boolean().optional(),
  category: z.enum(["WORK", "PERSONAL"]).optional(),
  dueDate: z.string().optional().nullable(),
  order: z.number().optional(), // client sends order index; we map internally
});

// GET /api/tasks?completed=true|false&category=WORK|PERSONAL
r.get(
  "/",
  async (req: ReqU<any, any, { completed?: string; category?: string }>, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

    const completed = req.query.completed === "true";
    const cat = req.query.category as "WORK" | "PERSONAL" | undefined;

    // Use 'as any' so TS doesn't care if your generated client is stale
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId, done: completed, ...(cat ? { category: cat } : {}) },
      orderBy: [{ sortIndex: "asc" } as any, { createdAt: "asc" }], // <-- cast
    } as any);

    res.json(tasks);
  }
);

// POST /api/tasks
r.post(
  "/",
  async (req: ReqU<any, { title: string; category?: string; dueDate?: string }>, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

    const parsed = createTask.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const position = await prisma.task.count({ where: { userId: req.userId } });

    const data: any = {
      title: parsed.data.title,
      userId: req.userId,
      category: parsed.data.category ?? "PERSONAL",
      sortIndex: position, // mapped field in Prisma (DB column "order")
    };
    if (parsed.data.dueDate) data.dueDate = new Date(parsed.data.dueDate);

    // Cast the whole call so TS doesn't reject unknown fields on stale client
    const task = await (prisma.task.create as any)({ data });

    res.json(task);
  }
);

// PATCH /api/tasks/:id
r.patch(
  "/:id",
  async (
    req: ReqU<
      { id: string },
      { title?: string; done?: boolean; category?: string; dueDate?: string | null; order?: number }
    >,
    res: Response
  ) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

    const parsed = updateTask.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });

    const id = req.params.id;
    const existing = await prisma.task.findFirst({ where: { id, userId: req.userId } });
    if (!existing) return res.status(404).json({ message: "Not found" });

    const data: any = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.dueDate !== undefined) {
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    }
    if (parsed.data.done !== undefined) {
      data.done = parsed.data.done;
      data.completedAt = parsed.data.done ? new Date() : null;
    }
    if (parsed.data.order !== undefined) {
      data.sortIndex = parsed.data.order; // map incoming 'order' -> Prisma 'sortIndex'
    }

    const updated = await (prisma.task.update as any)({ where: { id }, data });
    res.json(updated);
  }
);

// DELETE /api/tasks/:id
r.delete("/:id", async (req: ReqU<{ id: string }>, res: Response) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default r;

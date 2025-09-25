import { Router } from "express";
import { prisma } from "../db";

const r = Router();

type ReqU = Express.Request & { userId?: string };

r.get("/", async (req: ReqU, res) => {
  if (!req.userId) return res.status(401).json({ message: "Unauthenticated" });

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ message: "User not found" });

  const [activeCount, completedCount] = await Promise.all([
    prisma.task.count({ where: { userId: req.userId, done: false } }),
    prisma.task.count({ where: { userId: req.userId, done: true } }),
  ]);

  res.json({
    email: user.email,
    createdAt: user.createdAt,   // ISO string
    activeCount,
    completedCount,
  });
});

export default r;

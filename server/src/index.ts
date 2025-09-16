import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/auth";
import tasksRouter from "./routes/tasks";
import { requireAuth } from "./middleware/requireAuth";

const app = express();

const corsOrigins: (string | RegExp)[] =
  process.env.NODE_ENV === "production"
    ? (process.env.CORS_ORIGIN || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    : [/^http:\/\/localhost:\d+$/];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

// 🔐 protect all task endpoints so req.userId is set
app.use("/api/tasks", requireAuth, tasksRouter);

app.get("/", (_req, res) => res.send("API is running. Try /api/health"));

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log(
    "env loaded:",
    JSON.stringify(
      {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: !!process.env.JWT_SECRET,
        COOKIE_NAME: process.env.COOKIE_NAME || "(default: token)",
      },
      null,
      2
    )
  );
});

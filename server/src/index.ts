import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// (imports for routers if you have them)

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req: Request, res: Response) => res.json({ ok: true }));

// app.use("/api/auth", authRouter);
// app.use("/api/tasks", tasksRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request & { userId?: string }, res: Response, next: NextFunction) {
  try {
    const cookieName = process.env.COOKIE_NAME || "todolist_token";
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ message: "Unauthenticated" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");

    const payload = jwt.verify(token, secret) as { sub: string };
    if (!payload?.sub) return res.status(401).json({ message: "Unauthenticated" });

    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthenticated" });
  }
}

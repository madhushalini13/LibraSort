import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    await db
      .insert(usersTable)
      .values({ id: userId })
      .onConflictDoNothing({ target: usersTable.id });
    next();
  } catch (error) {
    req.log.error({ error }, "Unable to initialize authenticated user");
    res
      .status(503)
      .json({ error: "Unable to connect to the library database. Please try again." });
  }
};

export function authenticatedUserId(req: Parameters<RequestHandler>[0]): string {
  const userId = getAuth(req).userId;
  if (!userId) {
    throw new Error("Authenticated route received no user id");
  }
  return userId;
}
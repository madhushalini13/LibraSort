import { and, asc, count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { booksTable, db, optimizationsTable } from "@workspace/db";
import { requireAuth, authenticatedUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  const ownedBooks = eq(booksTable.userId, userId);
  const ownedOptimizations = eq(optimizationsTable.userId, userId);

  const [
    totals,
    categories,
    shelves,
    recentBooks,
    lastOptimizationRows,
  ] = await Promise.all([
    db
      .select({ totalBooks: count() })
      .from(booksTable)
      .where(ownedBooks),
    db
      .select({ category: booksTable.category, count: count() })
      .from(booksTable)
      .where(ownedBooks)
      .groupBy(booksTable.category)
      .orderBy(asc(booksTable.category)),
    db
      .select({ shelf: booksTable.shelf, count: count() })
      .from(booksTable)
      .where(ownedBooks)
      .groupBy(booksTable.shelf)
      .orderBy(asc(booksTable.shelf)),
    db
      .select()
      .from(booksTable)
      .where(ownedBooks)
      .orderBy(desc(booksTable.createdAt))
      .limit(5),
    db
      .select()
      .from(optimizationsTable)
      .where(ownedOptimizations)
      .orderBy(desc(optimizationsTable.createdAt))
      .limit(1),
  ]);

  const lastOptimization = lastOptimizationRows[0] ?? null;
  res.json(
    GetDashboardResponse.parse({
      totalBooks: Number(totals[0]?.totalBooks ?? 0),
      categoryCount: categories.length,
      shelfCount: shelves.length,
      categories: categories.map((row) => ({
        category: row.category,
        count: Number(row.count),
      })),
      shelves: shelves.map((row) => ({
        shelf: row.shelf,
        count: Number(row.count),
      })),
      recentBooks,
      lastOptimization,
    }),
  );
});

export default router;
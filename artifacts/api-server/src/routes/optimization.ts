import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetOptimizationHistoryQueryParams,
  GetOptimizationParams,
  GetOptimizationResponse,
  GetOptimizationHistoryResponse,
  RunOptimizationBody,
  RunOptimizationResponse,
} from "@workspace/api-zod";
import {
  booksTable,
  db,
  optimizationsTable,
  type ArrangementEntry,
} from "@workspace/db";
import {
  optimizeArrangement,
  toArrangementEntry,
  type SortCriteria,
} from "../lib/arrangement";
import { requireAuth, authenticatedUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/optimization", async (req, res): Promise<void> => {
  const parsed = RunOptimizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid optimization strategy." });
    return;
  }
  const userId = authenticatedUserId(req);
  const currentBooks = await db
    .select()
    .from(booksTable)
    .where(eq(booksTable.userId, userId))
    .orderBy(asc(booksTable.shelf), asc(booksTable.position), asc(booksTable.id));

  const result = optimizeArrangement(currentBooks, parsed.data.criteria as SortCriteria);
  const oldPositions = new Map(
    currentBooks.map((book) => [book.id, { shelf: book.shelf, position: book.position }]),
  );
  const positionsChanged = result.books.reduce((changed, book) => {
    const old = oldPositions.get(book.id);
    return changed + (old && (old.shelf !== book.shelf || old.position !== book.position) ? 1 : 0);
  }, 0);

  const beforeOrder = currentBooks.map(toArrangementEntry);
  const afterOrder: ArrangementEntry[] = result.books.map(toArrangementEntry);
  const record = await db.transaction(async (tx) => {
    for (const book of result.books) {
      await tx
        .update(booksTable)
        .set({ shelf: book.shelf, position: book.position, updatedAt: new Date() })
        .where(
          and(
            eq(booksTable.id, book.id),
            eq(booksTable.userId, userId),
          ),
        );
    }
    const [inserted] = await tx
      .insert(optimizationsTable)
      .values({
        userId,
        criteria: parsed.data.criteria,
        algorithm: "Stable merge sort, criterion grouping, and balanced shelf allocation",
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(n)",
        booksProcessed: result.books.length,
        positionsChanged,
        operationsCount: result.operationsCount,
        executionTimeMs: result.executionTimeMs,
        beforeOrder,
        afterOrder,
      })
      .returning();
    if (!inserted) throw new Error("Optimization history could not be saved.");
    return inserted;
  });
  res.json(RunOptimizationResponse.parse(record));
});

router.get("/optimization/history", async (req, res): Promise<void> => {
  const parsed = GetOptimizationHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid history limit." });
    return;
  }
  const history = await db
    .select()
    .from(optimizationsTable)
    .where(eq(optimizationsTable.userId, authenticatedUserId(req)))
    .orderBy(desc(optimizationsTable.createdAt))
    .limit(parsed.data.limit ?? 20);
  res.json(GetOptimizationHistoryResponse.parse(history));
});

router.get("/optimization/history/:id", async (req, res): Promise<void> => {
  const params = GetOptimizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid optimization id." });
    return;
  }
  const [optimization] = await db
    .select()
    .from(optimizationsTable)
    .where(
      and(
        eq(optimizationsTable.id, params.data.id),
        eq(optimizationsTable.userId, authenticatedUserId(req)),
      ),
    )
    .limit(1);
  if (!optimization) {
    res.status(404).json({ error: "Optimization not found." });
    return;
  }
  res.json(GetOptimizationResponse.parse(optimization));
});

export default router;
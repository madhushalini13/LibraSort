import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateBookBody,
  CreateBookResponse,
  DeleteBookParams,
  GetBookParams,
  GetBookResponse,
  GetBooksQueryParams,
  GetBooksResponse,
  UpdateBookBody,
  UpdateBookParams,
  UpdateBookResponse,
} from "@workspace/api-zod";
import { booksTable, db } from "@workspace/db";
import { requireAuth, authenticatedUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();
router.use(requireAuth);

const orderByFor = (sort: string | undefined) => {
  switch (sort) {
    case "title-desc":
      return [desc(sql`lower(${booksTable.title})`), asc(booksTable.id)];
    case "author":
      return [asc(sql`lower(${booksTable.author})`), asc(sql`lower(${booksTable.title})`)];
    case "publication-year":
      return [asc(booksTable.publicationYear), asc(sql`lower(${booksTable.title})`)];
    case "category":
      return [asc(sql`lower(${booksTable.category})`), asc(sql`lower(${booksTable.title})`)];
    case "shelf":
      return [asc(sql`lower(${booksTable.shelf})`), asc(booksTable.position)];
    case "position":
      return [asc(sql`lower(${booksTable.shelf})`), asc(booksTable.position)];
    case "title-asc":
    default:
      return [asc(sql`lower(${booksTable.title})`), asc(booksTable.id)];
  }
};

function validIsbn(value: string): boolean {
  const normalizedIsbn = value.replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(normalizedIsbn)) {
    const sum = [...normalizedIsbn].reduce(
      (total, digit, index) =>
        total + (digit === "X" ? 10 : Number(digit)) * (10 - index),
      0,
    );
    return sum % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(normalizedIsbn)) {
    const sum = [...normalizedIsbn].reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
      0,
    );
    return sum % 10 === 0;
  }
  return false;
}

function isbnOrNull(value: string | null | undefined): string | null | undefined {
  if (value == null || value.trim() === "") return null;
  if (!validIsbn(value)) {
    throw new Error("ISBN must be a valid ISBN-10 or ISBN-13.");
  }
  return value.trim();
}

router.get("/books", async (req, res): Promise<void> => {
  const parsed = GetBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid search or pagination values." });
    return;
  }

  const userId = authenticatedUserId(req);
  const { q, category, shelf, status, sort, page = 1, pageSize = 20 } = parsed.data;
  const filters = [eq(booksTable.userId, userId)];
  if (category) filters.push(eq(booksTable.category, category));
  if (shelf) filters.push(eq(booksTable.shelf, shelf));
  if (status) filters.push(eq(booksTable.status, status));
  if (q?.trim()) {
    const pattern = `%${q.trim()}%`;
    const searchFilter = or(
      ilike(booksTable.title, pattern),
      ilike(booksTable.author, pattern),
      ilike(booksTable.isbn, pattern),
      ilike(booksTable.category, pattern),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  const whereClause = and(...filters);
  const offset = (page - 1) * pageSize;

  const [countResult, items, categories, shelves] = await Promise.all([
    db.select({ total: count() }).from(booksTable).where(whereClause),
    db
      .select()
      .from(booksTable)
      .where(whereClause)
      .orderBy(...orderByFor(sort))
      .limit(pageSize)
      .offset(offset),
    db
      .selectDistinct({ category: booksTable.category })
      .from(booksTable)
      .where(eq(booksTable.userId, userId))
      .orderBy(asc(booksTable.category)),
    db
      .selectDistinct({ shelf: booksTable.shelf })
      .from(booksTable)
      .where(eq(booksTable.userId, userId))
      .orderBy(asc(booksTable.shelf)),
  ]);

  res.json(
    GetBooksResponse.parse({
      items,
      total: Number(countResult[0]?.total ?? 0),
      page,
      pageSize,
      categories: categories.map((item) => item.category),
      shelves: shelves.map((item) => item.shelf),
    }),
  );
});

router.post("/books", async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the required book information." });
    return;
  }

  try {
    const isbn = isbnOrNull(parsed.data.isbn);
    const [book] = await db
      .insert(booksTable)
      .values({
        ...parsed.data,
        isbn,
        userId: authenticatedUserId(req),
        status: parsed.data.status ?? "available",
      })
      .returning();
    res.status(201).json(CreateBookResponse.parse(book));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ISBN ")) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get("/books/:id", async (req, res): Promise<void> => {
  const params = GetBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid book id." });
    return;
  }
  const [book] = await db
    .select()
    .from(booksTable)
    .where(
      and(
        eq(booksTable.id, params.data.id),
        eq(booksTable.userId, authenticatedUserId(req)),
      ),
    )
    .limit(1);
  if (!book) {
    res.status(404).json({ error: "Book not found." });
    return;
  }
  res.json(GetBookResponse.parse(book));
});

router.put("/books/:id", async (req, res): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Please check the book information." });
    return;
  }

  try {
    const [book] = await db
      .update(booksTable)
      .set({
        ...parsed.data,
        isbn:
          parsed.data.isbn === undefined
            ? undefined
            : isbnOrNull(parsed.data.isbn),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(booksTable.id, params.data.id),
          eq(booksTable.userId, authenticatedUserId(req)),
        ),
      )
      .returning();
    if (!book) {
      res.status(404).json({ error: "Book not found." });
      return;
    }
    res.json(UpdateBookResponse.parse(book));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ISBN ")) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.delete("/books/:id", async (req, res): Promise<void> => {
  const params = DeleteBookParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid book id." });
    return;
  }
  const [book] = await db
    .delete(booksTable)
    .where(
      and(
        eq(booksTable.id, params.data.id),
        eq(booksTable.userId, authenticatedUserId(req)),
      ),
    )
    .returning({ id: booksTable.id });
  if (!book) {
    res.status(404).json({ error: "Book not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;
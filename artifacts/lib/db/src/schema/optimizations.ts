import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const optimizationCriteriaEnum = pgEnum("optimization_criteria", [
  "category",
  "author",
  "title",
  "publicationYear",
]);

export type ArrangementEntry = {
  id: string;
  title: string;
  author: string;
  category: string;
  shelf: string;
  position: number;
};

export const optimizationsTable = pgTable(
  "optimizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    criteria: optimizationCriteriaEnum("criteria").notNull(),
    algorithm: text("algorithm").notNull(),
    timeComplexity: text("time_complexity").notNull(),
    spaceComplexity: text("space_complexity").notNull(),
    booksProcessed: integer("books_processed").notNull(),
    positionsChanged: integer("positions_changed").notNull(),
    operationsCount: integer("operations_count").notNull(),
    executionTimeMs: integer("execution_time_ms").notNull(),
    beforeOrder: jsonb("before_order").$type<ArrangementEntry[]>().notNull(),
    afterOrder: jsonb("after_order").$type<ArrangementEntry[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("optimizations_user_created_at_idx").on(table.userId, table.createdAt)],
);

export type Optimization = typeof optimizationsTable.$inferSelect;
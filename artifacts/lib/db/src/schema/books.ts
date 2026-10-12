import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const bookStatusEnum = pgEnum("book_status", [
  "available",
  "borrowed",
  "reserved",
]);

export const booksTable = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: text("isbn"),
    category: text("category").notNull(),
    publicationYear: integer("publication_year"),
    shelf: text("shelf").notNull(),
    position: integer("position").notNull(),
    status: bookStatusEnum("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("books_user_id_idx").on(table.userId),
    index("books_user_shelf_position_idx").on(
      table.userId,
      table.shelf,
      table.position,
    ),
    index("books_user_category_idx").on(table.userId, table.category),
  ],
);

export const usersBooksRelations = relations(usersTable, ({ many }) => ({
  books: many(booksTable),
}));

export const booksUserRelations = relations(booksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [booksTable.userId],
    references: [usersTable.id],
  }),
}));

export type Book = typeof booksTable.$inferSelect;
export type NewBook = typeof booksTable.$inferInsert;
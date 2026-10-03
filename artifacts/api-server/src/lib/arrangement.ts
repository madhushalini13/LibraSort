import type { Book as BookRecord } from "@workspace/db";

export type SortCriteria = "category" | "author" | "title" | "publicationYear";

export type ArrangementBook = Pick<
  BookRecord,
  | "id"
  | "title"
  | "author"
  | "category"
  | "publicationYear"
  | "shelf"
  | "position"
  | "status"
>;

export type ArrangedBook = ArrangementBook;

export type ArrangementResult = {
  books: ArrangedBook[];
  shelves: string[];
  operationsCount: number;
  executionTimeMs: number;
};

/**
 * Stable top-down merge sort. The comparison callback counts each actual
 * comparison, making the metric reproducible for a given input collection.
 */
function mergeSort<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  if (items.length < 2) return [...items];

  const midpoint = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, midpoint), compare);
  const right = mergeSort(items.slice(midpoint), compare);
  const merged: T[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (compare(left[leftIndex]!, right[rightIndex]!) <= 0) {
      merged.push(left[leftIndex++]!);
    } else {
      merged.push(right[rightIndex++]!);
    }
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareText(
  left: string,
  right: string,
  increment: () => void,
): number {
  increment();
  return normalized(left).localeCompare(normalized(right));
}

function groupValue(book: ArrangementBook, criteria: SortCriteria): string {
  if (criteria === "publicationYear") {
    return book.publicationYear == null ? "Unknown" : String(book.publicationYear);
  }
  return book[criteria];
}

function compareGroupValues(
  left: string,
  right: string,
  criteria: SortCriteria,
  increment: () => void,
): number {
  if (criteria === "publicationYear") {
    const leftYear = left === "Unknown" ? Number.NEGATIVE_INFINITY : Number(left);
    const rightYear = right === "Unknown" ? Number.NEGATIVE_INFINITY : Number(right);
    increment();
    return leftYear - rightYear;
  }
  return compareText(left, right, increment);
}

function compareWithinGroup(
  left: ArrangementBook,
  right: ArrangementBook,
  increment: () => void,
): number {
  return (
    compareText(left.title, right.title, increment) ||
    compareText(left.author, right.author, increment) ||
    compareText(left.id, right.id, increment)
  );
}

export function optimizeArrangement(
  inputBooks: readonly ArrangementBook[],
  criteria: SortCriteria,
): ArrangementResult {
  const startedAt = performance.now();
  let operationsCount = 0;
  const increment = () => {
    operationsCount += 1;
  };

  const groups = new Map<string, ArrangementBook[]>();
  for (const book of inputBooks) {
    const key = groupValue(book, criteria);
    const bucket = groups.get(key);
    if (bucket) bucket.push(book);
    else groups.set(key, [book]);
    increment();
  }

  const orderedGroupKeys = mergeSort([...groups.keys()], (left, right) =>
    compareGroupValues(left, right, criteria, increment),
  );

  const sortedBooks: ArrangementBook[] = [];
  for (const key of orderedGroupKeys) {
    const sortedGroup = mergeSort(groups.get(key)!, (left, right) =>
      compareWithinGroup(left, right, increment),
    );
    sortedBooks.push(...sortedGroup);
  }

  const shelves = mergeSort(
    [...new Set(inputBooks.map((book) => book.shelf))],
    (left, right) => compareText(left, right, increment),
  );
  const booksPerShelf = shelves.length
    ? Math.ceil(sortedBooks.length / shelves.length)
    : 0;
  const arranged = sortedBooks.map((book, index) => {
    increment();
    const shelfIndex = booksPerShelf
      ? Math.min(Math.floor(index / booksPerShelf), shelves.length - 1)
      : 0;
    return {
      ...book,
      shelf: shelves[shelfIndex] ?? book.shelf,
      position: booksPerShelf ? (index % booksPerShelf) + 1 : index + 1,
    };
  });

  return {
    books: arranged,
    shelves,
    operationsCount,
    executionTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
  };
}

export function toArrangementEntry(book: ArrangementBook): {
  id: string;
  title: string;
  author: string;
  category: string;
  shelf: string;
  position: number;
} {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    shelf: book.shelf,
    position: book.position,
  };
}
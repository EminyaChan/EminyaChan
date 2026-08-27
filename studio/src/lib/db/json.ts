import type { Prisma } from "@prisma/client";

// Prisma's generated Json input types don't structurally accept a plain
// `Record<string, unknown>` even though it's valid JSON at runtime. This
// round-trips through JSON to get a value Prisma's types are happy with.
export function toJsonInput<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

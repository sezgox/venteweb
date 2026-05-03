/**
 * Legacy no-op. The API loads the Prisma client from `<repo>/generated/prisma` at runtime
 * (see `src/prisma.service.ts`) so we never copy it into `dist/`.
 * Kept so old scripts or notes that call this file still exit successfully.
 */
console.log(
  'copy-generated-prisma: no-op; Prisma is loaded from the repo root at runtime.',
);
process.exit(0);

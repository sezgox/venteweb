import { existsSync } from 'fs';
import { join } from 'path';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { PrismaClient as PrismaClientType } from 'generated/prisma';

/**
 * Resolve venteweb repo root whether this file runs from dist/src (compiled) or src (e.g. ts-jest).
 * Load Prisma from <repo>/generated/prisma at runtime so we do not copy the client into dist/.
 * That avoids Windows EPERM/EPIPE when query_engine DLLs are locked by a running Node process.
 */
function resolveProjectRoot(): string {
  const one = join(__dirname, '..');
  const two = join(__dirname, '..', '..');
  if (existsSync(join(one, 'prisma', 'schema.prisma'))) return one;
  if (existsSync(join(two, 'prisma', 'schema.prisma'))) return two;
  throw new Error(
    `Could not find prisma/schema.prisma from __dirname=${__dirname}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient: PrismaClientBase } = require(
  join(resolveProjectRoot(), 'generated', 'prisma'),
) as { PrismaClient: new () => PrismaClientType };

@Injectable()
export class PrismaService
  extends PrismaClientBase
  implements OnModuleInit
{
  async onModuleInit() {
    await this.$connect();
  }
}

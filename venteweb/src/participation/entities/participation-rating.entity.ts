import { EventMode } from 'generated/prisma';

export class Rating {
  userId: string;
  eventId: string;
  eventMode?: EventMode;
  text?: string;
  score?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Rating> = {}) {
    Object.assign(this, partial);
  }
}

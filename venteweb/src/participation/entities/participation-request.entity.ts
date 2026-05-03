import { EventMode } from 'generated/prisma';
import { RequestStatus } from 'src/core/interfaces/request-participation-status.enum';
import { Event } from 'src/event/entities/event.entity';

export class ParticipationRequest {
  id: string;
  userId: string;
  eventId: string;
  eventMode?: EventMode;
  createdAt: Date;
  updatedAt: Date;
  event?: Event;
  text: string;
  status?: RequestStatus;

  constructor(partial: Partial<ParticipationRequest> = {}) {
    Object.assign(this, partial);
  }
}

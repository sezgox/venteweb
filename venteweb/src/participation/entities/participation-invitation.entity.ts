import { EventMode, ParticipationType } from 'generated/prisma';
import { RequestStatus } from 'src/core/interfaces/request-participation-status.enum';
import { Event } from 'src/event/entities/event.entity';

export class Invitation {
  id: string;
  userId: string;
  externalUserId?: string;
  eventId: string;
  eventMode?: EventMode;
  createdAt: Date;
  updatedAt: Date;
  invitationToken: string;
  event?: Partial<Event>;
  text: string;
  type: ParticipationType;
  status?: RequestStatus;
  externalUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };

  constructor(partial: Partial<Invitation> = {}) {
    Object.assign(this, partial);
  }
}

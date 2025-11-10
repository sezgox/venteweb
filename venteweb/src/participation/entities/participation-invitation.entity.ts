import { ParticipationType } from "generated/prisma";
import { RequestStatus } from "src/core/interfaces/request-participation-status.enum";
import { Event } from "src/event/entities/event.entity";

export class Invitation {
    userId: string;
    eventId: string;
    createdAt: Date;
    updatedAt: Date;
    invitationToken: string;
    event?: Partial<Event>;
    text: string;
    type: ParticipationType
    status?: RequestStatus;

    constructor(partial: Partial<Invitation> = {}) {
        Object.assign(this, partial);
    }
}
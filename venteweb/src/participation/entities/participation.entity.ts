import { ParticipationType } from "generated/prisma";
import { Event } from "src/event/entities/event.entity";
import { Rating } from "./participation-rating.entity";

export class Participation {
    id: string;
    userId: string;
    eventId: string;
    type: ParticipationType;
    createdAt: Date;
    updatedAt: Date;
    invitation: string;
    event?: Event;
    rating?: Rating;

    constructor(partial: Partial<Participation> = {}) {
        Object.assign(this, partial);
    }
}
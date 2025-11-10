import { RequestStatus } from "src/core/interfaces/request-participation-status.enum";

export class ParticipationRequest {

    id: string;
    userId: string;
    eventId: string;
    createdAt: Date;
    updatedAt: Date;
    event?: Event;
    text: string;
    status?: RequestStatus;

    constructor(partial: Partial<ParticipationRequest> = {}) {
        Object.assign(this, partial);
    }
}
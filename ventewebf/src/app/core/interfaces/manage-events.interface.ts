import { Event, Invitation, Participation, Request } from "./events.interfaces";

export interface ManageEvents {
  events: Event[];
  participations: Participation[];
  requests: Request[];
  invitations: Invitation[];
}

import { UserSummary } from "./user.interfaces";

export interface Event {
  id: string;
  organizerId: string;
  poster: string;
  name: string;
  visibility: Visibility;
  categories: EventCategory[];
  description: string;
  startDate: Date;
  endDate: Date;
  maxCollaborators?: number;
  maxAttendees?: number;
  requiresRequest: boolean;
  location: string;
  locationAlias: string;
  lat: number;
  lng: number;
  invitation?: string;
  requests: Request[];
  invitations: Invitation[];
  participations: ParticipationSummary[];
  organizer: UserSummary;
}

export interface ParticipationSummary{
    id: string;
    userId: string;
    eventId: string;
    type: ParticipationType;
    createdAt: Date;
    updatedAt: Date;
    user: UserSummary;
}

export interface Participation extends ParticipationSummary{
    invitation?: string;
    event: Event;
}

export interface Request {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    text: string;
    invitationToken?: string;
    user: UserSummary;
    event: Event;
}

export interface Invitation {
    id: string;
    userId: string;
    eventId: string;
    invitationToken: string;
    createdAt: Date;
    updatedAt: Date;
    text: string;
    user: UserSummary;
    event: Event;
    type: ParticipationType;
}

export enum ParticipationType {
  Collaboration = "Collaboration",
  Attendance = "Attendance"
}

export enum Visibility{
  Public = "Public",
  Private = "Private"
}

export interface CreateEventDto {
    organizerId: string;
    poster?: File;
    name: string;
    categories: EventCategory[];
    description: string;
    visibility: Visibility;
    maxAttendees?: number;
    maxCollaborators?: number;
    lat: number;
    lng: number;
    location: string;
    locationAlias: string;
    startDate: Date;
    endDate: Date;
    requiresRequest?: boolean;
    language?: string;
    tags?: string[];
}

export enum EventCategory {
  Sports = 'Sports',
  Educational = 'Educational',
  Pets = 'Pets',
  Gaming = 'Gaming',
  Political = 'Political',
  Food = 'Food',
  Party = 'Party',
  Music = 'Music',
  Meetup = 'Meetup',
  Art = 'Art',
  Conference = 'Conference',
  Workshop = 'Workshop',
  Competition = 'Competition',
  Tournament = 'Tournament'
}

export interface EventFilter{
    search?: string;
    date?: Date;
    endDate?: Date;
    category?: EventCategory;
    language?: string;
    visibility?: Visibility;
    collaboration?: boolean;
    radius?: number;
    lat?: number;
    lng?: number;
    latMin?: number;
    latMax?: number;
    lngMin?: number;
    lngMax?: number;
    page: number;
    sortBy?: 'date' | 'distance' | 'interest' | 'popularity' | 'rating';
}

export interface CreateRequestDto {
    userId: string;
    eventId: string;
    text: string;
    invitationToken?: string;
}

export interface CreateParticipationDto {
    userId: string;
    eventId: string
    type: ParticipationType;
    invitationId?: string;
    invitation?: string;
    requestId?: string;
}

export interface InvitationDto {
  eventId: string;
  text: string;
  type: ParticipationType;
}

export enum RequestStatus {
  Pending = "Pending",
  Accepted = "Accepted",
}

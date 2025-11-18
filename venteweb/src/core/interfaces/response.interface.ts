import { Category, Level, NotificationType, ParticipationType, Permission, Visibility } from "generated/prisma";

export interface CustomResponse<T>{
    results?: T;
    message: string;
    success: boolean;
    metadata?: Object;
}

export interface UserSummary {
    username: string;
    email: string;
    id: string;
    name: string;
    permission: Permission;
    level: Level;
    locale: string;
    photo: string;
}

export interface LoginResponse {
    access_token: string;
    user: UserSummary
}

export interface EventResponse {
    id: string;
    organizerId: string;
    poster: string;
    name: string;
    categories: Category[];
    description: string;
    visibility: Visibility;
    maxAttendees?: number;
    maxCollaborators?: number;
    lat: number;
    lng: number;
    location: string;
    startDate: Date;
    endDate: Date;
    requiresRequest: boolean;
    totalRate?: number;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    language?: string;
    participations?: ParticipationResponse[];
    requests?: ParticipationRequestResponse[];
}

export interface UserResponse extends UserSummary{
    events?: EventResponse[];
    participations?: ParticipationResponse[];
    invitations?: InvitationResponse[];
    requests?: ParticipationRequestResponse[];
    id: string;
    createdAt: Date;
    updatedAt: Date;
    lastLogin: Date;
    bio: string;
}

export interface UpdateUserResponse extends UserResponse {
    access_token: string;
}

export interface ParticipationRequestResponse {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    text: string;
}

export interface ParticipationResponse {
    id: string;
    userId: string;
    eventId: string;
    type: ParticipationType;
    rating?: RatingResponse;
    invitation?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RatingResponse {
    userId: string;
    eventId: string;
    participationId: string;
    text?: string;
    score?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvitationResponse {
    id: string;
    userId: string;
    eventId: string;
    invitationToken: string;
    createdAt: Date;
    updatedAt: Date;
    text: string;
}

export interface FollowResponse {
    followerId: string;
    followedId: string;
}

export interface NotificationResponse {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedId?: string;
    createdAt: Date;
    read: boolean;
}
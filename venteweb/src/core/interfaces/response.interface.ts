import {
  Category,
  EventMode,
  Level,
  NotificationType,
  ParticipationType,
  Permission,
  Visibility,
} from 'generated/prisma';

export interface CustomResponse<T> {
  results?: T;
  message: string;
  success: boolean;
  metadata?: object;
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
  active: boolean;
  emailSent?: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: UserSummary;
}

export interface EventResponse {
  id: string;
  organizerId: string;
  poster?: string | null;
  name: string;
  categories: Category[];
  description: string;
  visibility: Visibility;
  onlyVirtual?: boolean;
  maxAttendees?: number;
  maxCollaborators?: number;
  lat?: number;
  lng?: number;
  location?: string;
  locationAlias?: string;
  startDate?: Date;
  endDate?: Date;
  requiresRequest?: boolean;
  totalRate?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  language?: string;
  participations?: ParticipationResponse[];
  requests?: ParticipationRequestResponse[];
  onSiteEvent?: {
    eventId?: string;
    maxAttendees?: number | null;
    maxCollaborators?: number | null;
    lat: number;
    lng: number;
    location: string;
    locationAlias?: string | null;
    startDate: Date;
    endDate: Date;
    requiresRequest: boolean;
    totalRate?: number | null;
    ratingCount: number;
  } | null;
  virtualEvent?: {
    eventId?: string;
    maxAttendees?: number | null;
    maxCollaborators?: number | null;
    requiresRequest: boolean;
    totalRate?: number | null;
    ratingCount: number;
    startDate: Date;
    endDate: Date;
    platforms: Array<{
      id?: string;
      name: string;
      link: string;
    }>;
  } | null;
}

export interface UserResponse extends UserSummary {
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
  eventMode?: EventMode;
  text: string;
}

export interface ParticipationResponse {
  id: string;
  userId?: string;
  externalUserId?: string;
  eventId: string;
  eventMode?: EventMode;
  type: ParticipationType;
  rating?: RatingResponse;
  invitation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingResponse {
  id: string;
  userId: string;
  eventId: string;
  eventMode?: EventMode;
  participationId: string;
  text?: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    username: string;
    name: string;
    photo?: string | null;
  };
}

export interface RatingListResponse {
  rating: RatingResponse;
  event: {
    eventMode?: EventMode;
    totalRate?: number | null;
    ratingCount: number;
  };
}

export interface RatingSummaryResponse {
  eventMode?: EventMode;
  total: number;
  average?: number | null;
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface InvitationResponse {
  id: string;
  userId?: string;
  externalUserId?: string;
  eventId: string;
  eventMode?: EventMode;
  invitationToken: string;
  createdAt: Date;
  updatedAt: Date;
  text: string;
  type: ParticipationType;
  externalUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
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

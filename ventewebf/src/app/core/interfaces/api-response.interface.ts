import { Notification } from '../services/notifications.service';
import { CreateEventDto, CreateParticipationDto, CreateRequestDto, Event, EventFilter, Invitation, InvitationDto, Participation, Request } from './events.interfaces';
import { LoginDto } from './login.dto.interface';
import { ManageEvents } from './manage-events.interface';
import { RegisterDto } from './register.dto.interface';
import { EditUserDto, Follow, User, UserSummary } from './user.interfaces';

export interface ApiResponse<T> {
  results: T;
  success: boolean;
  metadata?: any;
  message: string;
}

export interface ApiError<T> {
    message: string;
    metadata?: T;
    success: boolean
}

interface LoginResponseDto {
  access_token: string;
  user: UserSummary;
}

interface RegisterResponseDto {
  email: string;
  name: string;
  username: string;
}

export type LoginSuccessResponse = ApiResponse<LoginResponseDto>;
export type LoginErrorResponse = ApiError<LoginDto>;

export type RegisterSuccessResponse = ApiResponse<RegisterResponseDto>;
export type RegisterErrorResponse = ApiError<RegisterDto>;

export type ManageEventsSuccessResponse = ApiResponse<ManageEvents>;
export type ManageEventsErrorResponse = ApiError<{userId: string}>;

export type CreateEventSuccessResponse = ApiResponse<Event>;
export type CreateEventErrorResponse = ApiError<{dto: CreateEventDto}>

export type GetEventsSuccessResponse = ApiResponse<Event[]>;
export type GetEventsErrorResponse = ApiError<{filter: EventFilter}>;

export type GetEventSuccessResponse = ApiResponse<Event>;
export type GetEventErrorResponse = ApiError<{id: string}>;

export type RequestCollaborationSuccessResponse = ApiResponse<Request>;
export type RequestCollaborationErrorResponse = ApiError<{dto: CreateRequestDto}>;

export type ParticipationSuccessResponse = ApiResponse<Participation>;
export type ParticipationErrorResponse = ApiError<{dto: CreateParticipationDto}>;

export type UserSuccessReponse = ApiResponse<User>;
export type UserErrorResponse = ApiError<{userId: string}>;

export type UpdateUserErrorResponse = ApiError<{dto: EditUserDto}>;

export type FollowSuccessResponse = ApiResponse<Follow>;
export type FollowErrorResponse = ApiError<{followedId: string}>;

export type SearchUsersSuccessResponse = ApiResponse<UserSummary[]>;
export type SearchUsersErrorResponse = ApiError<{search: string}>;

export type InvitationSuccessResponse = ApiResponse<Invitation>;
export type InvitationErrorResponse = ApiError<{dto: InvitationDto}>;

export type NotificationsSuccessResponse = ApiResponse<Notification[]>;
export type NotificationsErrorResponse = ApiError<{userId: string}>;

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;
export type RegisterResponse = RegisterSuccessResponse | RegisterErrorResponse;
export type ManageEventsResponse = ManageEventsSuccessResponse | ManageEventsErrorResponse;
export type CreateEventResponse = CreateEventSuccessResponse | CreateEventErrorResponse;
export type GetEventsResponse = GetEventsSuccessResponse | GetEventsErrorResponse;
export type GetEventResponse = GetEventSuccessResponse | GetEventErrorResponse;
export type RequestCollaborationResponse = RequestCollaborationSuccessResponse | RequestCollaborationErrorResponse;
export type ParticipationResponse = ParticipationSuccessResponse | ParticipationErrorResponse;
export type UserResponse = UserSuccessReponse | UserErrorResponse;
export type UpdateUserResponse = UserSuccessReponse | UpdateUserErrorResponse;
export type FollowResponse = FollowSuccessResponse | FollowErrorResponse;
export type SearchUsersResponse = SearchUsersSuccessResponse | SearchUsersErrorResponse;
export type InvitationResponse = InvitationSuccessResponse | InvitationErrorResponse;
export type NotificationsResponse = NotificationsSuccessResponse | NotificationsErrorResponse;

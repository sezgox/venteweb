import { Event, Participation } from "./events.interfaces";

export interface UserSummary {
  id: string;
  username: string;
  name: string;
  email: string;
  photo?: string;
  locale: string;
  bio: string;
}

export interface User extends UserSummary{
  events: Event[];
  participations: Participation[];
  followers: Follow[];
  following: Follow[];
}

export interface EditUserDto extends UserSummary{
  password?: string;
}

export interface Follow {
  followerId: string;
  followedId: string;
  follower: UserSummary;
  followed: UserSummary;
}


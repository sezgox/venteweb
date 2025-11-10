import { User } from "./user.entity";

export class Follow {
    followedId: string;
    followerId: string;
    follower: User;
    followed: User;
}
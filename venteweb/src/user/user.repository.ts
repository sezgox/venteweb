import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Level, Prisma } from './../../generated/prisma/index.d';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: Prisma.UserCreateInput) {
    try {
      return await this.prisma.user.create({ data: createUserDto });
    } catch (error) {
      if (error.code == 'P2002') {
        const target = error.meta.target[0];
        throw new BadRequestException(
          `User with ${target} "${createUserDto[target as keyof typeof createUserDto]}" already exists`,
        );
      } else {
        console.log(error);
        throw new InternalServerErrorException('Error creating user');
      }
    }
  }

  findByUniqueInput(uniqueInput: Prisma.UserWhereUniqueInput) {
    return this.prisma.user.findUnique({ where: uniqueInput });
  }

  async findOne(id: string, include?: Prisma.UserInclude) {
    return include
      ? await this.prisma.user.findUnique({ where: { id }, include })
      : await this.prisma.user.findUnique({ where: { id } });
  }

  async findByUsername(username: string, include?: Prisma.UserInclude) {
    return include
      ? await this.prisma.user.findUnique({ where: { username }, include })
      : await this.prisma.user.findUnique({ where: { username } });
  }

  async upgradeUserLevel(userId: string, newLevel: Level): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    });
  }

  async getFollowers(userId: string) {
    return await this.prisma.follow.findMany({ where: { followedId: userId } });
  }

  async getFollowing(userId: string) {
    return await this.prisma.follow.findMany({ where: { followerId: userId } });
  }

  async getFriends(userId: string) {
    const followers = await this.getFollowers(userId); // quienes te siguen
    const following = await this.getFollowing(userId); // quienes sigues

    // Convertimos a sets para comparar ids
    const followersSet = new Set(followers.map((f) => f.followerId)); //obtenemos id de los seguidores
    const followingSet = new Set(following.map((f) => f.followedId)); //obtenemos id de los seguidos

    // Intersección: amigos
    const friendsIds = [...followersSet].filter((id) => followingSet.has(id)); //filtramos de los seguidores -> lo que están también en los seguidos

    return friendsIds;
  }

  async usersAreFriends(userId: string, friendId: string) {
    const friendsIds = await this.getFriends(userId);
    return friendsIds.includes(friendId);
  }

  async findAll(search: string) {
    const term = search?.trim();

    return await this.prisma.user.findMany({
      where: term
        ? {
            OR: [
              { username: { contains: term, mode: 'insensitive' } },
              { name: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          }
        : undefined,
    });
  }

  async findManyByIds(userIds: string[], search?: string) {
    const term = search?.trim();
    if (userIds.length === 0) {
      return [];
    }

    return await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(term
          ? {
              OR: [
                { username: { contains: term, mode: 'insensitive' } },
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  async remove(id: string) {
    return await this.prisma.user.delete({ where: { id } });
  }

  async follow(followerId: string, followedId: string) {
    return await this.prisma.follow.create({
      data: { followerId, followedId },
    });
  }

  async unfollow(followerId: string, followedId: string) {
    return await this.prisma.follow.delete({
      where: { followerId_followedId: { followerId, followedId } },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async logout(userId: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async login(userId: string, refreshToken: string, lastLogin?: Date) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken, ...(lastLogin !== undefined && { lastLogin }) },
    });
  }

  async updateLastLogin(userId: string, lastLogin: Date) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin },
    });
  }

  async activate(userId: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { active: true, activatedAt: new Date(), emailSent: true },
    });
  }

  async updateEmailSent(userId: string, emailSent: boolean) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { emailSent },
    });
  }
}

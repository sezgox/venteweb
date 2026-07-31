import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Visibility } from 'generated/prisma';
import { AuthService } from 'src/auth/auth.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventInvitationsService } from 'src/core/services/event-invitations.service';
import { EventService } from 'src/event/event.service';
import { EventRepository } from 'src/event/event.repository';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { ExternalInvitationActionDto } from 'src/participation/dto/external-invitation-action.dto';
import { Invitation } from 'src/participation/entities/participation-invitation.entity';
import { ParticipationRepository } from 'src/participation/participation.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventRepository: EventRepository,
    private readonly participationRepository: ParticipationRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly authS: AuthService,
    private readonly eventInvitationsService: EventInvitationsService,
    private readonly eventService: EventService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const saltOrRounds = 10;
    const password = createUserDto.password;
    const existingEmailUser = await this.userRepository.findByUniqueInput({
      email: createUserDto.email,
    });
    if (existingEmailUser) {
      if (existingEmailUser.active) {
        throw new BadRequestException(
          `User with email "${createUserDto.email}" already exists`,
        );
      }
      if (!existingEmailUser.password) {
        throw new BadRequestException(
          `User with email "${createUserDto.email}" already exists`,
        );
      }
      const passwordMatches = await bcrypt.compare(
        password,
        existingEmailUser.password,
      );
      if (!passwordMatches) {
        throw new BadRequestException(
          `User with email "${createUserDto.email}" already exists`,
        );
      }
      return existingEmailUser;
    }

    const existingUsernameUser = await this.userRepository.findByUniqueInput({
      username: createUserDto.username,
    });
    if (existingUsernameUser) {
      throw new BadRequestException(
        `User with username "${createUserDto.username}" already exists`,
      );
    }

    const hash = await bcrypt.hash(password, saltOrRounds);
    const createdUser = await this.userRepository.create({
      ...createUserDto,
      password: hash,
      active: false,
      activatedAt: null,
      firebaseUid: null,
      emailSent: false,
    });
    return createdUser;
  }

  findAll(search: string) {
    return this.userRepository.findAll(search);
  }

  async findFriends(userId: string, search: string) {
    const requester = await this.userRepository.findOne(userId);
    if (!requester) {
      throw new UnauthorizedException('Requester user does not exist');
    }

    const friendIds = await this.userRepository.getFriends(userId);
    return await this.userRepository.findManyByIds(friendIds, search);
  }

  async findOne(username: string, reqUserId?: string) {
    const include: any = {};
    const userData = await this.userRepository.findByUsername(username);
    if (!userData) throw new NotFoundException('El usuario no existe');

    if (reqUserId) {
      const requestUser = await this.userRepository.findOne(reqUserId);
      if (!requestUser)
        throw new UnauthorizedException('El usuario solicitante no existe');

      const areFriends = await this.userRepository.usersAreFriends(
        requestUser.id,
        userData.id,
      );

      if (requestUser.username === username) {
        include.events = {
          orderBy: { createdAt: 'desc' },
          include: {
            onSiteEvent: true,
            virtualEvent: { include: { platforms: true } },
          },
        };
        include.participations = { include: { event: true } };
      } else {
        include.events = areFriends
          ? {
              orderBy: { createdAt: 'desc' },
              include: {
                onSiteEvent: true,
                virtualEvent: { include: { platforms: true } },
              },
            }
          : {
              where: { visibility: Visibility.Public },
              orderBy: { createdAt: 'desc' },
              include: {
                onSiteEvent: true,
                virtualEvent: { include: { platforms: true } },
              },
            };
        include.participations = {
          where: { event: { visibility: Visibility.Public } },
        };
      }
    } else {
      // Usuario no logeado: solo eventos públicos
      include.events = {
        where: { visibility: Visibility.Public },
        orderBy: { createdAt: 'desc' },
        include: {
          onSiteEvent: true,
          virtualEvent: { include: { platforms: true } },
        },
      };
      include.participations = {
        where: { event: { visibility: Visibility.Public } },
        include: { event: true },
      };
    }
    include.followers = { include: { follower: true } };
    include.following = { include: { followed: true } };
    const userProfile = await this.userRepository.findByUsername(
      username,
      include,
    );
    const profileWithEvents = userProfile as typeof userProfile & {
      events?: any[];
    };
    if (Array.isArray(profileWithEvents?.events)) {
      profileWithEvents.events = [...profileWithEvents.events].sort(
        (a: any, b: any) => {
          const aStart = new Date(
            a.onSiteEvent?.startDate ??
              a.virtualEvent?.startDate ??
              a.createdAt ??
              0,
          ).getTime();
          const bStart = new Date(
            b.onSiteEvent?.startDate ??
              b.virtualEvent?.startDate ??
              b.createdAt ??
              0,
          ).getTime();
          return bStart - aStart;
        },
      );
    }
    const { password, ...userWithoutPassword } = userProfile;
    return userWithoutPassword;
  }

  async findByUsername(username: string) {
    return await this.userRepository.findByUsername(username.toLowerCase());
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    file: Express.Multer.File,
  ) {
    const userData = await this.userRepository.findOne(id);
    if (!userData) throw new NotFoundException('User not found');
    let cdPayload: any;
    try {
      const folder = 'users/' + id;

      if (file) {
        cdPayload = await this.cloudinaryService.uploadFile(file, folder);
        const imageUrl = cdPayload.secure_url;
        updateUserDto.photo = imageUrl;
      } else {
        updateUserDto.photo = userData.photo;
      }

      const updatedFields = await this.getUpdatedFields(
        updateUserDto,
        userData,
      );
      const updatedUser = await this.userRepository.update(id, updatedFields);
      const access_token = await this.authS.createJwtToken(updatedUser);
      const { password, ...safeUser } = updatedUser;
      const result = { ...safeUser, access_token };
      return result;
    } catch (error) {
      if (cdPayload?.public_id) {
        await this.cloudinaryService.deleteFile(cdPayload.public_id);
      }

      throw new BadRequestException(
        `Error updating user: ${error.message || error}`,
      );
    }
  }

  private async getUpdatedFields(updateUserDto: UpdateUserDto, userData: any) {
    const updatedFields: Partial<UpdateUserDto> = {};
    if (updateUserDto.username != userData.username) {
      updatedFields.username = updateUserDto.username;
    }
    if (updateUserDto.name != userData.name) {
      updatedFields.name = updateUserDto.name;
    }
    if (updateUserDto.password) {
      const saltOrRounds = 10;
      const password = updateUserDto.password;
      const hash = await bcrypt.hash(password, saltOrRounds);
      updatedFields.password = hash;
    }
    if (updateUserDto.email != userData.email) {
      updatedFields.email = updateUserDto.email;
    }
    if (updateUserDto.photo != userData.photo) {
      updatedFields.photo = updateUserDto.photo;
    }
    if (updateUserDto.bio != userData.bio) {
      updatedFields.bio = updateUserDto.bio;
    }
    // Permission and level are server-managed. Never accept self-service
    // privilege changes through the profile endpoint.
    if (updateUserDto.locale != userData.locale) {
      updatedFields.locale = updateUserDto.locale;
    }
    return updatedFields;
  }

  async remove(id: string, reqUserId: string) {
    const currentUser = await this.userRepository.findOne(reqUserId);
    if (currentUser.id === id) return this.userRepository.remove(id);
    throw new ForbiddenException(
      `Usuario ${currentUser.username} intentando eliminar a otro usuario`,
    );
  }

  async inviteFriendToEvent(
    invitedId: string,
    createInvitationDto: CreateInvitationDto,
    inviterId: string,
  ) {
    return await this.eventInvitationsService.inviteFriendToEvent(
      invitedId,
      createInvitationDto,
      inviterId,
    );
  }

  async cancelOrRejectInvitation(
    invitedId: string,
    reqUserId: string,
    invitationId: string,
  ) {
    const invitedData = await this.userRepository.findOne(invitedId);
    const requesterData = await this.userRepository.findOne(reqUserId);
    const invitationData =
      await this.participationRepository.findInvitationById(invitationId);
    if (!requesterData)
      throw new BadRequestException('El usuario solicitante no existe');
    if (!invitedData)
      throw new BadRequestException('El usuario invitado no existe');
    if (!invitationData)
      throw new BadRequestException('La invitación solicitada no existe');

    const invited = new User(invitedData);
    const invitation = new Invitation(invitationData);
    const requester = new User(requesterData);

    const message = requester.removeInvitation(invitation, invited);
    const result =
      await this.participationRepository.removeInvitation(invitationId);
    return { result, message };
  }

  async createParticipationFromInvitation(
    dto: ExternalInvitationActionDto,
    externalUserId: string,
  ) {
    return await this.eventService.acceptExternalInvitation(
      externalUserId,
      dto,
    );
  }

  async rejectExternalInvitation(
    dto: ExternalInvitationActionDto,
    externalUserId: string,
  ) {
    return await this.eventService.rejectExternalInvitation(
      externalUserId,
      dto,
    );
  }

  async getManagedEvents(userId: string) {
    const userData = await this.userRepository.findOne(userId, {
      events: {
        include: { participations: true, requests: true, invitations: true },
      },
      participations: { include: { event: true, user: true } },
      invitations: { include: { event: true, user: true } },
      requests: { include: { event: true, user: true } },
    });
    if (!userData)
      throw new NotFoundException('El usuario solicitante no existe');
    const user = new User(userData);
    const managedEvents = user.getManagedEvents();
    return managedEvents;
  }

  async followUser(followerId: string, followedId: string) {
    const followerData = await this.userRepository.findOne(followerId, {
      followers: true,
      following: true,
    });
    const followedData = await this.userRepository.findOne(followedId);
    if (!followerData)
      throw new BadRequestException('El usuario seguidor no existe');
    if (!followedData)
      throw new BadRequestException('El usuario a seguir no existe');
    const follower = new User(followerData);
    const followed = new User(followedData);
    follower.canFollow(followed);
    return await this.userRepository.follow(followerId, followedId);
  }

  async unfollowUser(followerId: string, followedId: string) {
    const followerData = await this.userRepository.findOne(followerId, {
      followers: true,
      following: true,
    });
    const followedData = await this.userRepository.findOne(followedId);
    if (!followerData)
      throw new BadRequestException('El usuario seguidor no existe');
    if (!followedData)
      throw new BadRequestException('El usuario a seguir no existe');
    const follower = new User(followerData);
    const followed = new User(followedData);
    follower.canUnfollow(followed);
    return await this.userRepository.unfollow(followerId, followedId);
  }
}

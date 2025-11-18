import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Visibility } from 'generated/prisma';
import { AuthService } from 'src/auth/auth.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { InvitationsService } from 'src/core/services/invitations.service';
import { Event } from 'src/event/entities/event.entity';
import { EventRepository } from 'src/event/event.repository';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
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
    private readonly invitationsService: InvitationsService, 
    private readonly participationRepository: ParticipationRepository, 
    private readonly cloudinaryService: CloudinaryService, 
    private readonly eventEmitter: EventEmitter2,
    private readonly authS: AuthService
  ) {}

  async create(createUserDto: CreateUserDto) {
    const saltOrRounds = 10;
    const password = createUserDto.password;
    const hash = await bcrypt.hash(password, saltOrRounds);
    createUserDto.password = hash;
    const createdUser = await this.userRepository.create(createUserDto);
    return createdUser;
  }

  findAll(search: string) {
    return this.userRepository.findAll(search);
  }

  async findOne(username: string, reqUserId?: string) {
    const include: any = {};
    const userData = await this.userRepository.findByUsername(username);
    if (!userData) throw new NotFoundException('El usuario no existe');

    if (reqUserId) {
      const requestUser = await this.userRepository.findOne(reqUserId);
      if (!requestUser) throw new UnauthorizedException('El usuario solicitante no existe');

      const areFriends = await this.userRepository.usersAreFriends(requestUser.id, userData.id);


      if (requestUser.username === username) {
        console.log('User ' + requestUser.username + ' is requesting own profile')
        include.events = {orderBy: {startDate: 'desc'}};
        include.participations = {include: {event: true}};
      } else {
        include.events = areFriends ? {orderBy: {startDate: 'desc'}} : { where: { visibility: Visibility.Public }, orderBy: {startDate: 'desc'} };
        include.participations = { where: { event: { visibility: Visibility.Public } } };
      }
    } else {
      // Usuario no logeado: solo eventos públicos
      include.events = { where: { visibility: Visibility.Public } };
      include.participations = { where: { event: { visibility: Visibility.Public } }, include: { event: true } };
    }
    include.followers = {include: {follower: true}};
    include.following = {include: {followed: true}};
    const userProfile = await this.userRepository.findByUsername(username, include);
    const { password, ...userWithoutPassword } = userProfile;
    return userWithoutPassword;
  }


  async findByUsername(username: string) {
    return await this.userRepository.findByUsername(username.toLowerCase());
  }

  async update(id: string, updateUserDto: UpdateUserDto, file: Express.Multer.File,) {
    const userData = await this.userRepository.findOne(id);
    if(!userData) throw new NotFoundException('User not found');
    let cdPayload: any;
    try {
      const folder = 'users/' + id;

      if(file){
        cdPayload = await this.cloudinaryService.uploadFile(file, folder);
        const imageUrl = cdPayload.secure_url;
        updateUserDto.photo = imageUrl;
      }else{
        updateUserDto.photo = userData.photo;
      }

      const updatedFields = await this.getUpdatedFields(updateUserDto, userData);
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
    if (updateUserDto.permission != userData.permission) {
      updatedFields.permission = updateUserDto.permission;
    }
    if (updateUserDto.level != userData.level) {
      updatedFields.level = updateUserDto.level;
    }
    if (updateUserDto.locale != userData.locale) {
      updatedFields.locale = updateUserDto.locale;
    }
    return updatedFields;
  }

  async remove(id: string, reqUserId: string) {
    const currentUser = await this.userRepository.findOne(reqUserId);
    if(currentUser.id === id) return this.userRepository.remove(id);
    throw new ForbiddenException(`Usuario ${currentUser.username} intentando eliminar a otro usuario`);
  }

  async inviteUserToEvent(invitedId: string, createInvitationDto: CreateInvitationDto, inviterId: string) {
    const invitedData = await this.userRepository.findOne(invitedId);
    const eventData = await this.eventRepository.findOne(createInvitationDto.eventId);
    const inviterData = await this.userRepository.findOne(inviterId);
    if(!invitedData) throw new BadRequestException('El usuario al que quieres invitar no existe');
    if(!eventData) throw new BadRequestException('El evento solicitado no existe');
    if(!inviterData) throw new BadRequestException('El usuario que trata de invitar no existe');

    const inviter = new User(inviterData);
    const invited = new User(invitedData);
    const event = new Event(eventData);

    const invitation = inviter.inviteUserToEvent(invited, event, createInvitationDto);

    const masterKey = this.invitationsService.decryptMasterKey(event.invitation);
    const token = await this.invitationsService.generateInvitation(event.id, event.organizerId, masterKey, invited.id);
    invitation.userId = invited.id;
    invitation.invitationToken = token;
    const result = await this.participationRepository.createInvitationToParticipate(invitation);
    this.eventEmitter.emit('invitation.created', {
        eventId: invitation.eventId,
        invitedUserId: invitation.userId,
        eventName: event.name,
        text: invitation.text,
    });
    return result;
  }

  async cancelOrRejectInvitation(invitedId: string, reqUserId: string, invitationId: string) {
    const invitedData = await this.userRepository.findOne(invitedId);
    const requesterData = await this.userRepository.findOne(reqUserId);
    const invitationData = await this.participationRepository.findInvitationById(invitationId);
    if(!requesterData) throw new BadRequestException('El usuario solicitante no existe');
    if(!invitedData) throw new BadRequestException('El usuario invitado no existe');
    if(!invitationData) throw new BadRequestException('La invitación solicitada no existe');

    const invited = new User(invitedData);
    const invitation = new Invitation(invitationData);
    const requester = new User(requesterData);

    const message = requester.removeInvitation(invitation, invited);
    const result = await this.participationRepository.removeInvitation(invitationId);
    return {result, message}
  }

  async createParticipationFromInvitation(invitedId: string, reqUserId: string, invitationId: string, createParticipationDto: CreateParticipationDto) {
    const invitedData = await this.userRepository.findOne(invitedId, {participations: true});
    const requesterData = await this.userRepository.findOne(reqUserId);
    const invitationData = await this.participationRepository.findInvitationById(invitationId);
    if(!invitedData) throw new BadRequestException('El usuario invitado no existe');
    if(!requesterData) throw new BadRequestException('El usuario solicitante no existe');
    if(!invitationData) throw new BadRequestException('La invitación solicitada no existe');
    if(requesterData.id !== invitedData.id) throw new BadRequestException('No puedes aceptar una invitación de otro usuario');
    const invited = new User(invitedData);
    const invitation = new Invitation(invitationData);
    invited.acceptInvitation(invitation, createParticipationDto);
    const participations = await this.participationRepository.getParticipationsByEvent(invitation.event.id);
    const event = new Event(invitation.event);
    event.participations = participations;
    const {participation} = event.addAttendee(createParticipationDto);
    return await this.participationRepository.createParticipation({participation, invitationId});
  }

  
  async getManagedEvents(userId: string){
    const userData = await this.userRepository.findOne(userId, {
      events: {include: {participations: true, requests: true, invitations: true}}, 
      participations: {include: {event: true, user: true}}, 
      invitations: {include: {event: true, user: true}}, 
      requests: {include: {event: true, user: true}}
    });
    if(!userData) throw new NotFoundException('El usuario solicitante no existe');
    const user = new User(userData);
    const managedEvents = user.getManagedEvents();
    return managedEvents;
  }

  async followUser(followerId: string, followedId: string){
    const followerData = await this.userRepository.findOne(followerId, {followers: true, following: true});
    const followedData = await this.userRepository.findOne(followedId);
    if(!followerData) throw new BadRequestException('El usuario seguidor no existe');
    if(!followedData) throw new BadRequestException('El usuario a seguir no existe');
    const follower = new User(followerData)
    const followed = new User(followedData)
    follower.canFollow(followed);
    return await this.userRepository.follow(followerId, followedId);
  }

  async unfollowUser(followerId: string, followedId: string){
    const followerData = await this.userRepository.findOne(followerId, {followers: true, following: true });
    const followedData = await this.userRepository.findOne(followedId);
    if(!followerData) throw new BadRequestException('El usuario seguidor no existe');
    if(!followedData) throw new BadRequestException('El usuario a seguir no existe');
    const follower = new User(followerData);
    const followed = new User(followedData);
    follower.canUnfollow(followed);
    return await this.userRepository.unfollow(followerId, followedId);
  }


}

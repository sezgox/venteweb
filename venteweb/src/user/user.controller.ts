import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { CustomResponse, FollowResponse, InvitationResponse, UserResponse, UserSummary } from 'src/core/interfaces/response.interface';
import { CreateInvitationDto } from 'src/participation/dto/create-invitation.dto';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('')
  async create(@Body() createUserDto: CreateUserDto, @Res() res: Response<CustomResponse<UserSummary>>) {
    try {
      const user = await this.userService.create(createUserDto);
        res.status(201);
        return res.json({ results: { id: user.id, username: user.username, email: user.email, name: user.name, permission: user.permission, level: user.level, locale: user.locale, photo: user.photo }, message: 'User created', success: true, });
    } catch (error) {
      return res.json({ success: false, message: error.message ?? 'User not created', metadata: { ...createUserDto, password: '[REDACTED]' } });
    }
    
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Query('search') search: string, @Req() req: Request, @Res() res: Response<CustomResponse<UserSummary[]>>) {
    try {
      const users = await this.userService.findAll(search);
      return res.json({results: users, message: 'Usuarios encontrados', success: true, metadata: {search}});
    }catch(err){
      res.status(err.status ?? 400)
      return res.json({success: false, message: err.message ?? 'Error al obtener usuario', metadata: {search}})
    }
  }

  @Get(':username')
  async findOne(@Param('username') username: string, @Req() req: Request, @Res() res: Response<CustomResponse<UserResponse>>) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const user = await this.userService.findOne(username, reqUserId);
      return res.json({results: user, message: 'Usuario encontrado', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener usuario', metadata: {username}});
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/invitations')
  async inviteUserToEvent(@Param('id') invitedUserId: string, @Body() createInvitationDto: CreateInvitationDto, @Req() req: Request, @Res() res: Response<CustomResponse<InvitationResponse>>) {
    const inviterId = req['user'].sub;
    try {
      const invitation = await this.userService.inviteUserToEvent(invitedUserId, createInvitationDto, inviterId);
      return res.json({ message: 'Invitación enviada', success: true, results: invitation});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener usuario', metadata: {dto: {...createInvitationDto, invitedUserId}}});
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/invitations/:invitationId')
  async cancelOrRejectInvitation(@Param('id') invitedUserId: string, @Param('invitationId') invitationId: string, @Req() req: Request, @Res() res: Response) {
    const reqUserId = req['user'].sub;
    try {
      const {result, message} = await this.userService.cancelOrRejectInvitation(invitedUserId, reqUserId, invitationId);
      return res.json({ message, success: true, results: result});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener usuario', metadata: {invitedUserId, invitationId}});
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/invitations/:invitationId')
  async addParticipationFromInvitation(@Param('id') invitedUserId: string, @Param('invitationId') invitationId: string, @Body() createParticipationDto: CreateParticipationDto, @Req() req: Request, @Res() res: Response) {
    const reqUserId = req['user'].sub;
    try {
      const participation = await this.userService.createParticipationFromInvitation(invitedUserId, reqUserId, invitationId, createParticipationDto);
      res.json({results: participation, message: 'Participación creada', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al crear la request para el evento', metadata: {invitedUserId, invitationId}});
    }
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('photo')) 
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request, @Res() res: Response<CustomResponse<UserResponse>>, @UploadedFile() photo?: Express.Multer.File) {
    const requesterId = req['user'].sub;
    if(requesterId != id) throw new BadRequestException('You can only update your own profile');
    try {
      const updatedUser = await this.userService.update(id, updateUserDto, photo);
      return res.json({results: updatedUser, message: 'User updated', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'User not updated', metadata: {dto: id, ...updateUserDto}});
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request, @Res() res: Response<CustomResponse<UserSummary>>) {
    const reqUserId = req['user'].sub;
    try {
      const deletedUser = await this.userService.remove(id, reqUserId);
      return res.json({results: {id: deletedUser.id, username: deletedUser.username, email: deletedUser.email, name: deletedUser.name, permission: deletedUser.permission, level: deletedUser.level, locale: deletedUser.locale, photo: deletedUser.photo}, message: 'Usuario eliminado', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al eliminar usuario', metadata: {userId: id}});
    }
  }

  @UseGuards(AuthGuard)
  @Get('manage/events')
  async getManagedEvents(@Req() req: Request, @Res() res: Response) {
    const userId = req['user'].sub;
    try {
      const managedEvents = await this.userService.getManagedEvents(userId);
      return res.json({results: managedEvents, message: 'Eventos administrados', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener usuario', metadata: {userId}});
    }
  }

  @UseGuards(AuthGuard)
  @Post(':id/follows')
  async followUser(@Param('id') followedId: string, @Req() req: Request, @Res() res: Response) {
    const followerId = req['user'].sub;
    try {
      const follow = await this.userService.followUser(followerId, followedId);
      return res.json({results: follow, message: 'User followed', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al seguir usuario', metadata: {followedId}});
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/follows')
  async unfollowUser(@Param('id') followedId: string, @Req() req: Request, @Res() res: Response<CustomResponse<FollowResponse>>) {
    const followerId = req['user'].sub;
    try {
      const unfollow = await this.userService.unfollowUser(followerId, followedId);
      return res.json({results: unfollow, message: 'User unfollowed', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al seguir usuario', metadata: {id: followedId}});
    }
  }
  
}

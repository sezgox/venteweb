import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { CustomResponse, EventResponse, ParticipationRequestResponse, ParticipationResponse } from 'src/core/interfaces/response.interface';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  /* CREAR EVENTO */
  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('poster'))
  async create(@UploadedFile() poster: Express.Multer.File, @Body() createEventDto: CreateEventDto, @Req() req: Request, @Res() res: Response<CustomResponse<EventResponse>>) {
    const reqUserId = req['user'].sub;
    try {
      const event = await this.eventService.create(createEventDto, poster, reqUserId)
      return res.json({message: 'Event created', success: true, results: event, });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Event not created', metadata: {dto: createEventDto}});
    }
  }

  /* OBTENER EVENTOS (FILTRADOS) */
  @Get()
  async findAll(@Query() filter: FilterEventDto, @Req() req: Request, @Res() res: Response<CustomResponse<EventResponse[]>>) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    console.log(filter)
    try {
      const events = await this.eventService.findAll(filter, reqUserId);
      return res.json({results: events, message: 'Eventos encontrados', success: true, metadata: {filter}});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener eventos', metadata: {filter}});
    }
  }

  /* OBTENER EVENTO */
  @Get(':id')
  async findOne(@Query('invitation') invitation: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response<CustomResponse<EventResponse>>) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const event = await this.eventService.findOne(id, reqUserId, invitation);
      return res.json({results: event, message: 'Evento encontrado', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al obtener el evento', metadata: {filter: id, ...{invitation}}});
    }
  }

  /* PARA CREAR INVITATIONTOKEN PARA PODER *VER* EVENTOS PRIVADOS (EN CASO DE PUBLICOS, EL TOKEN SE IGNORA) */
  @UseGuards(AuthGuard)
  @Get(':id/invitationToken')
  async getInvitationToken(@Param('id') eventId:string, @Req() req: Request, @Res() res: Response<CustomResponse<{invitation:string}>>){
    const reqUserId = req['user'].sub;
    try{
      const invitation = await this.eventService.getInvitationToken(eventId, reqUserId);
      return res.json({ success: true, results: {invitation}, message: 'Invitación generada'});
    }catch(err){
      res.status(err.status ?? 400)
      return res.json({success: false, message: err.message ?? 'Error obteniendo la invitación', metadata: {eventId}})
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  /* ELIMINAR EVENTOS */
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') eventId: string, @Req() req: Request, @Res() res: Response<CustomResponse<EventResponse>>) {
    const reqUserId = req['user'].sub;
    try{
      const removedEvent = await this.eventService.remove(eventId, reqUserId);
      return res.json({ message: 'Evento eliminado', success: true, results: removedEvent});
    }catch(err){
      if(err.status == 401){
        return res.json({success: false, message: 'No eres el creador del evento, no puedes eliminarlo'});
      }else{
        return res.json({success: false, message: err.message ?? 'Error al eliminar evento', metadata: {eventId}});
      }
    }
  }

  /* CREAR REQUESTS EN EV PUBLICOS O PRIVADOS, CON O SIN INVTACIÓN */
  @UseGuards(AuthGuard)
  @Post(':id/requests')
  async requestParticipation(@Param('id') eventId: string, @Body() createRequestParticipationDto: CreateRequestParticipationDto, @Res() res: Response<CustomResponse<ParticipationRequestResponse>>, @Req() req: Request) {
    const reqUserId = req['user'].sub;
    try {
      const request = await this.eventService.requestParticipation(eventId, createRequestParticipationDto, reqUserId);
      res.json({results: request, message: 'Request enviada', success: true});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al crear la request para el evento', metadata: {dto: {...createRequestParticipationDto, eventId}}});
    }
  }

  /* ENDPOINT PARA CANCELAR O RECHAZAR UNA REQUEST DE COLABORACIÓN */
  @UseGuards(AuthGuard)
  @Delete(':id/requests/:requestId')
  async cancelOrRejectRequest(@Param('id') eventId: string, @Param('requestId') requestId: string, @Req() req: Request, @Res() res: Response<CustomResponse<ParticipationRequestResponse>>) {
    const reqUserId = req['user'].sub;
    try {
      const {removedRequest, message} = await this.eventService.cancelOrRejectRequest(eventId, requestId, reqUserId);
      return res.json({ message, success: true, results: removedRequest});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al eliminar la request para el evento', metadata: {dto: {eventId, requestId}}});
    }
  }

  /* ACEPTAR REQUESTS, CREAR PARTICIPACIONES EN EV PUBLICOS */
  @UseGuards(AuthGuard)
  @Post(':id/participations')
  async addParticipation(@Param('id') eventId: string, @Body() createParticipationDto: CreateParticipationDto, @Req() req: Request, @Res() res: Response<CustomResponse<ParticipationResponse>>) {
    const reqUserId = req['user'].sub;
    try {
      const participation = await this.eventService.createParticipation(eventId, createParticipationDto, reqUserId);
      res.json({results: participation, message: 'Participación creada', success: true });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al crear la request para el evento', metadata: {dto: {...createParticipationDto}}});
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/participations/:participationId')
  async removeParticipation(@Param('id') eventId: string, @Param('participationId') requestId: string, @Req() req: Request, @Res() res: Response<CustomResponse<ParticipationResponse>>) {
    const reqUserId = req['user'].sub;
    try {
      const {removedParticipation, message} = await this.eventService.removeParticipation(eventId, requestId, reqUserId);
      return res.json({ message, success: true, results: removedParticipation});
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({success: false, message: error.message ?? 'Error al eliminar la participación para el evento', metadata: {dto: {eventId, requestId}}});
    }
  }

}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { EventMode } from 'generated/prisma';
import { AuthGuard } from 'src/core/guards/auth.guard';
import {
  CustomResponse,
  EventResponse,
  ParticipationRequestResponse,
  ParticipationResponse,
  RatingListResponse,
  RatingResponse,
  RatingSummaryResponse,
} from 'src/core/interfaces/response.interface';
import { CreateParticipationDto } from 'src/participation/dto/create-participation.dto';
import { PrepareInvitationDto } from 'src/participation/dto/prepare-invitation.dto';
import { CreateRequestParticipationDto } from 'src/participation/dto/create-request-participation.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { UpsertRatingDto } from './dto/upsert-rating.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';
import { RatingService } from './rating.service';

@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly ratingService: RatingService,
  ) {}

  /* CREAR EVENTO */
  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('poster'))
  async create(
    @UploadedFile() poster: Express.Multer.File,
    @Body() createEventDto: CreateEventDto,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<EventResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const event = await this.eventService.create(
        createEventDto,
        poster,
        reqUserId,
      );
      return res.json({
        message: 'Event created',
        success: true,
        results: event,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Event not created',
        metadata: {
          dto: createEventDto,
          hint: 'Poster is optional. You can create events without poster and frontend can render a default image.',
        },
      });
    }
  }

  /* CREA INVITACIÓN PARA USUARIO REGISTRADO O EXTERNO (A TRAVÉS DE INVITACIONES VIA FORMULARIO) */
  @UseGuards(AuthGuard)
  @Post(':id/invitations')
  async prepareInvitation(
    @Param('id') eventId: string,
    @Body() prepareInvitationDto: PrepareInvitationDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const requesterId = req['user'].sub;
    try {
      const invitation = await this.eventService.prepareInvitation(
        eventId,
        prepareInvitationDto,
        requesterId,
      );
      return res.json({
        success: true,
        message: 'Invitation created and dispatched',
        results: invitation,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Failed to create invitation',
        metadata: { eventId, dto: prepareInvitationDto },
      });
    }
  }

  /* OBTENER EVENTOS (FILTRADOS) */
  @Get()
  async findAll(
    @Query() filter: FilterEventDto,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<EventResponse[]>>,
  ) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const { events, total, page, limit } = await this.eventService.findAll(
        filter,
        reqUserId,
      );
      const skip = (page - 1) * limit;
      const hasNextPage = skip + events.length < total;
      return res.json({
        results: events,
        message: 'Eventos encontrados',
        success: true,
        metadata: {
          filter,
          page,
          limit,
          total,
          hasNextPage,
        },
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Error al obtener eventos',
        metadata: { filter },
      });
    }
  }

  /* OBTENER EVENTO */
  @Get(':id')
  async findOne(
    @Query('invitation') invitation: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<EventResponse>>,
  ) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const event = await this.eventService.findOne(id, reqUserId, invitation);
      return res.json({
        results: event,
        message: 'Evento encontrado',
        success: true,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Error al obtener el evento',
        metadata: { filter: id, ...{ invitation } },
      });
    }
  }

  /* PARA CREAR INVITATIONTOKEN PARA PODER *VER* EVENTOS PRIVADOS (EN CASO DE PUBLICOS, EL TOKEN SE IGNORA) */
  @UseGuards(AuthGuard)
  @Get(':id/invitationToken')
  async getInvitationToken(
    @Param('id') eventId: string,
    @Query('eventMode') eventMode: EventMode,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<{ invitation: string }>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const invitation = await this.eventService.getInvitationToken(
        eventId,
        reqUserId,
        eventMode,
      );
      return res.json({
        success: true,
        results: { invitation },
        message: 'Invitación generada',
      });
    } catch (err) {
      res.status(err.status ?? 400);
      return res.json({
        success: false,
        message: err.message ?? 'Error obteniendo la invitación',
        metadata: { eventId, eventMode },
      });
    }
  }

  @Get(':eventId/ratings')
  async listRatings(
    @Param('eventId') eventId: string,
    @Query('eventMode') eventMode: EventMode,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('invitation') invitation: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<RatingResponse[]>>,
  ) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const result = await this.ratingService.listRatings(
        eventId,
        reqUserId,
        eventMode,
        Number(page),
        Number(limit),
        invitation,
      );
      return res.json({
        success: true,
        message: 'Ratings found',
        results: result.ratings,
        metadata: {
          eventMode: result.eventMode,
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasNextPage: result.hasNextPage,
        },
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Could not load ratings',
        metadata: { eventId, eventMode, page, limit, invitation },
      });
    }
  }

  @Get(':eventId/ratings/summary')
  async getRatingSummary(
    @Param('eventId') eventId: string,
    @Query('eventMode') eventMode: EventMode,
    @Query('invitation') invitation: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<RatingSummaryResponse>>,
  ) {
    const reqUserId = req['user'] ? req['user'].sub : '';
    try {
      const summary = await this.ratingService.getSummary(
        eventId,
        reqUserId,
        eventMode,
        invitation,
      );
      return res.json({
        success: true,
        message: 'Rating summary found',
        results: summary,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Could not load rating summary',
        metadata: { eventId, eventMode, invitation },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Post(':eventId/ratings')
  async upsertRating(
    @Param('eventId') eventId: string,
    @Body() dto: UpsertRatingDto,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<RatingListResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const result = await this.ratingService.upsertRating(
        eventId,
        reqUserId,
        dto,
      );
      return res.json({
        success: true,
        message: 'Rating saved',
        results: result,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Could not save rating',
        metadata: { eventId, dto },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Patch(':eventId/ratings/me')
  async updateMyRating(
    @Param('eventId') eventId: string,
    @Body() dto: UpsertRatingDto,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<RatingListResponse>>,
  ) {
    return await this.upsertRating(eventId, dto, req, res);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(id, updateEventDto);
  }

  /* ELIMINAR EVENTOS */
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') eventId: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<EventResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const removedEvent = await this.eventService.remove(eventId, reqUserId);
      return res.json({
        message: 'Evento eliminado',
        success: true,
        results: removedEvent,
      });
    } catch (err) {
      if (err.status == 401) {
        return res.json({
          success: false,
          message: 'No eres el creador del evento, no puedes eliminarlo',
        });
      } else {
        return res.json({
          success: false,
          message: err.message ?? 'Error al eliminar evento',
          metadata: { eventId },
        });
      }
    }
  }

  /* CREAR REQUESTS EN EV PUBLICOS O PRIVADOS, CON O SIN INVTACIÓN */
  @UseGuards(AuthGuard)
  @Post(':id/requests')
  async requestParticipation(
    @Param('id') eventId: string,
    @Body() createRequestParticipationDto: CreateRequestParticipationDto,
    @Res() res: Response<CustomResponse<ParticipationRequestResponse>>,
    @Req() req: Request,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const request = await this.eventService.requestParticipation(
        eventId,
        createRequestParticipationDto,
        reqUserId,
      );
      res.json({ results: request, message: 'Request enviada', success: true });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Error al crear la request para el evento',
        metadata: { dto: { ...createRequestParticipationDto, eventId } },
      });
    }
  }

  /* ENDPOINT PARA CANCELAR O RECHAZAR UNA REQUEST DE COLABORACIÓN */
  @UseGuards(AuthGuard)
  @Delete(':id/requests/:requestId')
  async cancelOrRejectRequest(
    @Param('id') eventId: string,
    @Param('requestId') requestId: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<ParticipationRequestResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const { removedRequest, message } =
        await this.eventService.cancelOrRejectRequest(
          eventId,
          requestId,
          reqUserId,
        );
      return res.json({ message, success: true, results: removedRequest });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Error al eliminar la request para el evento',
        metadata: { dto: { eventId, requestId } },
      });
    }
  }

  /* ACEPTAR REQUESTS, CREAR PARTICIPACIONES EN EV PUBLICOS */
  @UseGuards(AuthGuard)
  @Post(':id/participations')
  async addParticipation(
    @Param('id') eventId: string,
    @Body() createParticipationDto: CreateParticipationDto,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<ParticipationResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const participation = await this.eventService.createParticipation(
        eventId,
        createParticipationDto,
        reqUserId,
      );
      res.json({
        results: participation,
        message: 'Participación creada',
        success: true,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message: error.message ?? 'Error al crear la request para el evento',
        metadata: { dto: { ...createParticipationDto } },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':id/participations/:participationId')
  async removeParticipation(
    @Param('id') eventId: string,
    @Param('participationId') requestId: string,
    @Req() req: Request,
    @Res() res: Response<CustomResponse<ParticipationResponse>>,
  ) {
    const reqUserId = req['user'].sub;
    try {
      const { removedParticipation, message } =
        await this.eventService.removeParticipation(
          eventId,
          requestId,
          reqUserId,
        );
      return res.json({
        message,
        success: true,
        results: removedParticipation,
      });
    } catch (error) {
      res.status(error.status ?? 400);
      return res.json({
        success: false,
        message:
          error.message ?? 'Error al eliminar la participación para el evento',
        metadata: { dto: { eventId, requestId } },
      });
    }
  }
}

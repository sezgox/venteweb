import { Controller, Get, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { CustomResponse, NotificationResponse } from 'src/core/interfaces/response.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    /**
     * Obtener todas las notificaciones de un usuario
     */
    @UseGuards(AuthGuard)
    @Get('')
    async getMyNotifications(@Req() req: Request, @Res() res: Response<CustomResponse<NotificationResponse[]>>) {
        const userId = req['user'].sub;
        try {
            const notifications = await this.notificationsService.getNotificationsForUser(userId);
            return res.json({results: notifications, message: 'Notificaciones obtenidas', success: true});
        } catch (error) {
            res.status(error.status ?? 400);
            return res.json({success: false, message: error.message ?? 'Error al obtener notificaciones', metadata: {userId}});
        }
    }

    @UseGuards(AuthGuard)
    @Patch(':id')
    async markAsRead(@Param('id') id: string, @Req() req: Request, @Res() res: Response<CustomResponse<NotificationResponse>>) {
        const userId = req['user'].sub;
        try {
            const notification = await this.notificationsService.markAsRead(id);
            return res.json({results: notification, message: 'Notificación marcada como leída', success: true});
        } catch (error) {
            res.status(error.status ?? 400);
            return res.json({success: false, message: error.message ?? 'Error al marcar notificación como leída', metadata: {id}});
        }
    }
}

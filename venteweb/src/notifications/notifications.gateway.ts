// notifications.gateway.ts
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { jwtConfig } from 'src/core/consts/jwt-config.const';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    server.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      try {
        const payload = this.jwtService.verify(token, {secret: jwtConfig.secret});

        // Lo guardamos para el socket
        socket.data.userId = payload.sub;
        next();
      } catch (err) {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(socket: Socket) {
    const userId = socket.data.userId;

    // Unir socket a su room personal
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`User ${socket.data.userId} disconnected`);
  }

  // Método para enviar notificación
  notifyUser(userId: string, notification: any) {
    console.log(notification)
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}

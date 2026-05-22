import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/telemedicine',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class TelemedicineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TelemedicineGateway.name);
  private connectedClients: Map<string, { socketId: string; sessionId: string; role: string }> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove client from tracking
    for (const [userId, data] of this.connectedClients.entries()) {
      if (data.socketId === client.id) {
        this.connectedClients.delete(userId);
        // Notify the room that user has left
        client.to(data.sessionId).emit('user-disconnected', { userId, role: data.role });
        break;
      }
    }
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string; role: string },
  ) {
    client.join(data.sessionId);
    this.connectedClients.set(data.userId, {
      socketId: client.id,
      sessionId: data.sessionId,
      role: data.role,
    });
    this.logger.log(`User ${data.userId} (${data.role}) joined session ${data.sessionId}`);

    // Notify others in the room
    client.to(data.sessionId).emit('user-joined', {
      userId: data.userId,
      role: data.role,
    });

    // Send current participants count
    const room = this.server.sockets.adapter.rooms.get(data.sessionId);
    const participantCount = room ? room.size : 1;
    this.server.to(data.sessionId).emit('participant-count', { count: participantCount });

    return { success: true, participantCount };
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    client.leave(data.sessionId);
    this.connectedClients.delete(data.userId);

    client.to(data.sessionId).emit('user-left', { userId: data.userId });

    const room = this.server.sockets.adapter.rooms.get(data.sessionId);
    const participantCount = room ? room.size : 0;
    this.server.to(data.sessionId).emit('participant-count', { count: participantCount });

    return { success: true };
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; signal: any; toUserId?: string },
  ) {
    if (data.toUserId) {
      // Send signal to specific user
      const target = this.connectedClients.get(data.toUserId);
      if (target) {
        this.server.to(target.socketId).emit('signal', {
          signal: data.signal,
          fromUserId: data.toUserId,
        });
      }
    } else {
      // Broadcast signal to everyone in the room except sender
      client.to(data.sessionId).emit('signal', {
        signal: data.signal,
        fromUserId: data.toUserId,
      });
    }
  }

  @SubscribeMessage('screen-share-start')
  handleScreenShareStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    client.to(data.sessionId).emit('screen-share-started', { userId: data.userId });
  }

  @SubscribeMessage('screen-share-stop')
  handleScreenShareStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; userId: string },
  ) {
    client.to(data.sessionId).emit('screen-share-stopped', { userId: data.userId });
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; message: string; senderName: string; senderType: string },
  ) {
    this.server.to(data.sessionId).emit('new-chat-message', {
      message: data.message,
      senderName: data.senderName,
      senderType: data.senderType,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('bandwidth-report')
  handleBandwidthReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; bandwidthScore: string; qualityScore: string },
  ) {
    this.server.to(data.sessionId).emit('bandwidth-update', {
      bandwidthScore: data.bandwidthScore,
      qualityScore: data.qualityScore,
    });
  }

  @SubscribeMessage('waiting-room-status')
  handleWaitingRoomStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; status: string },
  ) {
    this.server.to(data.sessionId).emit('waiting-room-status-change', { status: data.status });
  }

  /**
   * Emit a notification to all participants in a session
   */
  notifySession(sessionId: string, event: string, payload: any) {
    this.server.to(sessionId).emit(event, payload);
  }
}
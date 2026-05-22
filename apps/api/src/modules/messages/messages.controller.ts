import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SendMessageDto } from './messages.dto';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  async send(@Body() data: SendMessageDto, @Req() req: any) {
    return this.messagesService.send(data, req.user.tenantId, req.user.id);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox messages' })
  async getInbox(
    @Query('isRead') isRead: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.messagesService.getInbox(req.user.tenantId, req.user.id, {
      isRead: isRead ? isRead === 'true' : undefined,
      page, pageSize,
    });
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get sent messages' })
  async getSent(@Query('page') page: number, @Query('pageSize') pageSize: number, @Req() req: any) {
    return this.messagesService.getSent(req.user.tenantId, req.user.id, { page, pageSize });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(@Req() req: any) {
    return { count: await this.messagesService.getUnreadCount(req.user.tenantId, req.user.id) };
  }

  @Get('thread/:messageId')
  @ApiOperation({ summary: 'Get message thread' })
  async getThread(@Param('messageId') messageId: string, @Req() req: any) {
    return this.messagesService.getThread(req.user.tenantId, messageId, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.messagesService.markAsRead(req.user.tenantId, id, req.user.id);
  }
}

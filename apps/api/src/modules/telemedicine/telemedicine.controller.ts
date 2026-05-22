import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TelemedicineService } from './telemedicine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CancelSessionDto,
  EndConsultationDto,
  SendChatMessageDto,
  ToggleRecordingDto,
  UpdateSessionStatsDto,
} from './telemedicine.dto';

@ApiTags('Telemedicine')
@Controller('telemedicine')
@UseGuards(JwtAuthGuard)
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @Post('sessions/:appointmentId')
  @ApiOperation({ summary: 'Create a telemedicine session for an appointment' })
  async createSession(@Param('appointmentId') appointmentId: string, @Req() req: any) {
    return this.telemedicineService.createSession(appointmentId, req.user.tenantId);
  }

  @Post('sessions/:id/waiting-room')
  @ApiOperation({ summary: 'Enter virtual waiting room' })
  async enterWaitingRoom(@Param('id') id: string, @Req() req: any) {
    return this.telemedicineService.enterWaitingRoom(id, req.user.tenantId);
  }

  @Post('sessions/:id/start')
  @ApiOperation({ summary: 'Start video consultation' })
  async startConsultation(@Param('id') id: string, @Req() req: any) {
    return this.telemedicineService.startConsultation(id, req.user.tenantId);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End video consultation' })
  async endConsultation(@Param('id') id: string, @Body() body: EndConsultationDto, @Req() req: any) {
    return this.telemedicineService.endConsultation(id, req.user.tenantId, body.notes);
  }

  @Post('sessions/:id/cancel')
  @ApiOperation({ summary: 'Cancel a telemedicine session' })
  async cancelSession(@Param('id') id: string, @Body() body: CancelSessionDto, @Req() req: any) {
    return this.telemedicineService.cancelSession(id, req.user.tenantId, body.reason);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all telemedicine sessions' })
  async getSessions(
    @Query('status') status: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @Req() req: any,
  ) {
    return this.telemedicineService.getSessions(req.user.tenantId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session details' })
  async getSession(@Param('id') id: string, @Req() req: any) {
    return this.telemedicineService.getSession(id, req.user.tenantId);
  }

  @Get('by-appointment/:appointmentId')
  @ApiOperation({ summary: 'Get session by appointment ID' })
  async getSessionByAppointment(@Param('appointmentId') appointmentId: string, @Req() req: any) {
    return this.telemedicineService.getSessionByAppointment(appointmentId, req.user.tenantId);
  }

  @Post('sessions/:id/chat')
  @ApiOperation({ summary: 'Send a chat message during consultation' })
  async sendMessage(@Param('id') id: string, @Body() body: SendChatMessageDto, @Req() req: any) {
    return this.telemedicineService.sendChatMessage(id, req.user.sub, body.senderType, body.message, req.user.tenantId);
  }

  @Get('sessions/:id/chat')
  @ApiOperation({ summary: 'Get chat messages for a session' })
  async getChatMessages(@Param('id') id: string, @Req() req: any) {
    return this.telemedicineService.getChatMessages(id, req.user.tenantId);
  }

  @Patch('sessions/:id/stats')
  @ApiOperation({ summary: 'Update session bandwidth/quality stats' })
  async updateStats(@Param('id') id: string, @Body() stats: UpdateSessionStatsDto, @Req() req: any) {
    return this.telemedicineService.updateSessionStats(id, req.user.tenantId, stats);
  }

  @Patch('sessions/:id/recording')
  @ApiOperation({ summary: 'Toggle recording for a session' })
  async toggleRecording(@Param('id') id: string, @Body() body: ToggleRecordingDto, @Req() req: any) {
    return this.telemedicineService.toggleRecording(id, req.user.tenantId, body.isRecorded);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get telemedicine usage statistics' })
  async getStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    return this.telemedicineService.getTelemedicineStats(req.user.tenantId, startDate, endDate);
  }
}

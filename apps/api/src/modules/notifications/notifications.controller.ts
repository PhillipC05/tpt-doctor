import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateTemplateDto,
  RenderNotificationTemplateDto,
  SendNotificationDto,
  SetPreferenceDto,
  UpdatePreferenceDto,
  UpdateTemplateDto,
} from './notifications.dto';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  // ==========================================================================
  // Template Management
  // ==========================================================================

  @Post('templates')
  createTemplate(@Body() body: CreateTemplateDto) {
    return this.notificationsService.createTemplate({ ...body, variables: body.variables ?? [], channels: body.channels ?? [] });
  }

  @Get('templates')
  listTemplates(@Query('tenantId') tenantId: string, @Query('type') type?: string) {
    return this.notificationsService.listTemplates(tenantId || 'default', type);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.notificationsService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  @Post('templates/:id/render')
  renderTemplate(@Param('id') id: string, @Body() body: RenderNotificationTemplateDto) {
    return this.notificationsService.renderTemplate(id, body.variables || {});
  }

  // ==========================================================================
  // Communication Preferences
  // ==========================================================================

  @Get('preferences/:userId')
  getPreference(@Param('userId') userId: string) {
    return this.notificationsService.getPreference(userId);
  }

  @Put('preferences/:userId')
  setPreference(@Param('userId') userId: string, @Body() body: SetPreferenceDto) {
    return this.notificationsService.setPreference({
      userId,
      tenantId: body.tenantId,
      channels: { email: true, sms: true, push: false, in_app: true, ...(body.channels as any) },
      types: body.types || {},
      quietHoursStart: body.quietHoursStart || null,
      quietHoursEnd: body.quietHoursEnd || null,
      timezone: body.timezone || 'UTC',
    });
  }

  @Patch('preferences/:userId')
  updatePreference(@Param('userId') userId: string, @Body() body: UpdatePreferenceDto) {
    return this.notificationsService.updatePreference(userId, body as any);
  }

  // ==========================================================================
  // Sending Notifications
  // ==========================================================================

  @Post('send')
  async send(@Body() body: SendNotificationDto) {
    return this.notificationsService.send(body);
  }

  // ==========================================================================
  // Delivery History
  // ==========================================================================

  @Get('deliveries/:userId')
  getDeliveryHistory(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.notificationsService.getDeliveryHistory(userId, limit ? parseInt(limit, 10) : 50);
  }
}

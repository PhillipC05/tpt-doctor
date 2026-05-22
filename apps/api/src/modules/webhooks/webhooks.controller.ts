import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpoint } from './webhooks.service';
import { RegisterWebhookDto, TriggerEventDto, UpdateWebhookDto } from './webhooks.dto';
import { ApiKeyGuard, RequireApiScope } from '../api-keys/api-key.guard';

@Controller('webhooks')
@UseGuards(ApiKeyGuard)
@RequireApiScope('webhooks:write')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  registerEndpoint(@Body() body: RegisterWebhookDto) {
    return this.webhooksService.registerEndpoint(body as Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>);
  }

  @Get()
  getAllEndpoints(@Query('tenantId') tenantId?: string) {
    return this.webhooksService.getAllEndpoints(tenantId);
  }

  @Get(':id')
  getEndpoint(@Param('id') id: string) {
    return this.webhooksService.getEndpoint(id);
  }

  @Put(':id')
  updateEndpoint(@Param('id') id: string, @Body() body: UpdateWebhookDto) {
    return this.webhooksService.updateEndpoint(id, body);
  }

  @Delete(':id')
  deleteEndpoint(@Param('id') id: string) {
    return this.webhooksService.deleteEndpoint(id);
  }

  @Post(':id/trigger')
  triggerEvent(@Param('id') id: string, @Body() body: TriggerEventDto) {
    return this.webhooksService.trigger(body.event, body.payload);
  }

  @Get(':id/deliveries')
  getDeliveries(@Param('id') id: string) {
    return this.webhooksService.getDeliveries(id);
  }

  @Post('deliveries/:deliveryId/retry')
  retryDelivery(@Param('deliveryId') deliveryId: string) {
    return this.webhooksService.retryDelivery(deliveryId);
  }

  @Post('receive')
  receiveWebhook(@Body() _body: Record<string, unknown>) {
    return { received: true, timestamp: new Date().toISOString() };
  }
}

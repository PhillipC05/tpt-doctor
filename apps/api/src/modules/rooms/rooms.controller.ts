import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { AssignPatientDto, CreateRoomDto, UpdateRoomDto } from './rooms.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('status') status?: string) {
    return this.roomsService.findAll(tenantId || 'default', status);
  }

  @Get('stats')
  getStats(@Query('tenantId') tenantId: string) {
    return this.roomsService.getOccupancyStats(tenantId || 'default');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateRoomDto) {
    return this.roomsService.create({ ...body, status: body.status ?? 'available', capacity: body.capacity ?? 1, equipment: body.equipment ?? [] });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateRoomDto) {
    return this.roomsService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.roomsService.delete(id);
  }

  @Post(':id/assign')
  assignPatient(@Param('id') id: string, @Body() body: AssignPatientDto) {
    return this.roomsService.assignPatient(id, body.patientId, body.appointmentId);
  }

  @Post(':id/release')
  releaseRoom(@Param('id') id: string) {
    return this.roomsService.releaseRoom(id);
  }
}

import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AddToWaitlistDto,
  CheckInDto,
  CheckOutDto,
  CreateAppointmentDto,
  CreateBlockTimeDto,
  CreateRecurringAppointmentDto,
  ScheduleReminderDto,
  UpdateAppointmentDto,
} from './appointments.dto';

@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment' })
  async create(@Body() data: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(data, req.user.tenantId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments' })
  async findAll(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId: string,
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.appointmentsService.findAll(req.user.tenantId, { startDate, endDate, staffId, status, page, pageSize });
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming appointments' })
  async getUpcoming(@Req() req: any, @Query('staffId') staffId?: string) {
    return this.appointmentsService.getUpcoming(req.user.tenantId, staffId);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get appointments for calendar view' })
  async getCalendar(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.appointmentsService.getCalendar(req.user.tenantId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment' })
  async update(@Param('id') id: string, @Body() data: UpdateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.update(id, data, req.user.tenantId, req.user.id);
  }

  @Delete(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.cancel(id, req.user.tenantId, req.user.id);
  }

  // ===== Recurring Appointments =====
  @Post('recurring')
  @ApiOperation({ summary: 'Create recurring appointments' })
  async createRecurring(@Body() data: CreateRecurringAppointmentDto, @Req() req: any) {
    return this.appointmentsService.createRecurring(data, req.user.tenantId, req.user.id);
  }

  // ===== Waitlist Management =====
  @Post('waitlist')
  @ApiOperation({ summary: 'Add patient to waitlist' })
  async addToWaitlist(@Body() data: AddToWaitlistDto, @Req() req: any) {
    return this.appointmentsService.addToWaitlist(data, req.user.tenantId, req.user.id);
  }

  @Get('waitlist')
  @ApiOperation({ summary: 'Get waitlist entries' })
  async getWaitlist(
    @Query('status') status: string,
    @Query('date') date: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.appointmentsService.getWaitlist(req.user.tenantId, { status, date, page, pageSize });
  }

  @Patch('waitlist/:id/notify')
  @ApiOperation({ summary: 'Notify waitlist entry' })
  async notifyWaitlistEntry(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.notifyWaitlistEntry(id, req.user.tenantId, req.user.id);
  }

  @Patch('waitlist/:id/book/:appointmentId')
  @ApiOperation({ summary: 'Book from waitlist' })
  async bookFromWaitlist(@Param('id') id: string, @Param('appointmentId') appointmentId: string, @Req() req: any) {
    return this.appointmentsService.bookFromWaitlist(id, appointmentId, req.user.tenantId);
  }

  @Delete('waitlist/:id')
  @ApiOperation({ summary: 'Remove from waitlist' })
  async removeFromWaitlist(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.removeFromWaitlist(id, req.user.tenantId, req.user.id);
  }

  // ===== Block Times / Override =====
  @Post('block-times')
  @ApiOperation({ summary: 'Create a block time' })
  async createBlockTime(@Body() data: CreateBlockTimeDto, @Req() req: any) {
    return this.appointmentsService.createBlockTime(data, req.user.tenantId, req.user.id);
  }

  @Get('block-times')
  @ApiOperation({ summary: 'Get block times' })
  async getBlockTimes(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId: string,
    @Req() req: any,
  ) {
    return this.appointmentsService.getBlockTimes(req.user.tenantId, { startDate, endDate, staffId });
  }

  @Delete('block-times/:id')
  @ApiOperation({ summary: 'Delete a block time' })
  async deleteBlockTime(@Param('id') id: string, @Req() req: any) {
    return this.appointmentsService.deleteBlockTime(id, req.user.tenantId, req.user.id);
  }

  // ===== Appointment Reminders =====
  @Post('reminders')
  @ApiOperation({ summary: 'Schedule an appointment reminder' })
  async scheduleReminder(@Body() data: ScheduleReminderDto, @Req() req: any) {
    return this.appointmentsService.scheduleReminder(data, req.user.tenantId);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'Get scheduled reminders' })
  async getReminders(
    @Query('status') status: string,
    @Query('appointmentId') appointmentId: string,
    @Req() req: any,
  ) {
    return this.appointmentsService.getReminders(req.user.tenantId, { status, appointmentId });
  }

  // ===== Check-in / Check-out =====
  @Post('check-in')
  @ApiOperation({ summary: 'Check in a patient' })
  async checkIn(@Body() data: CheckInDto, @Req() req: any) {
    return this.appointmentsService.checkIn(data, req.user.tenantId, req.user.id);
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Check out a patient' })
  async checkOut(@Param('id') id: string, @Body() data: CheckOutDto, @Req() req: any) {
    return this.appointmentsService.checkOut(id, data, req.user.tenantId, req.user.id);
  }

  @Get('check-ins')
  @ApiOperation({ summary: 'Get check-in/check-out records' })
  async getCheckInRecords(
    @Query('status') status: string,
    @Query('date') date: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.appointmentsService.getCheckInRecords(req.user.tenantId, { status, date, page, pageSize });
  }
}

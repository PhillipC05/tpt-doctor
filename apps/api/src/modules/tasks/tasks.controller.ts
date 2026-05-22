import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('status') status?: string, @Query('assignedTo') assignedTo?: string) {
    return this.tasksService.findAll(tenantId || 'default', status, assignedTo);
  }

  @Get('stats')
  getStats(@Query('tenantId') tenantId: string) {
    return this.tasksService.getStats(tenantId || 'default');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() body: CreateTaskDto) {
    return this.tasksService.create({ ...body, status: body.status ?? 'open' });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateTaskDto) {
    return this.tasksService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}

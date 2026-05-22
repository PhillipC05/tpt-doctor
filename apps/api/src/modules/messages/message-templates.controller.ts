import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MessageTemplatesService } from './message-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateMessageTemplateDto, RenderTemplateDto, UpdateMessageTemplateDto } from './message-templates.dto';

@ApiTags('Message Templates')
@Controller('message-templates')
@UseGuards(JwtAuthGuard)
export class MessageTemplatesController {
  constructor(private readonly templatesService: MessageTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a message template' })
  async create(@Body() data: CreateMessageTemplateDto, @Req() req: any) {
    return this.templatesService.create(data, req.user.tenantId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List message templates' })
  async findAll(
    @Query('category') category: string,
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: any,
  ) {
    return this.templatesService.findAll(req.user.tenantId, { category, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a message template' })
  async update(@Param('id') id: string, @Body() data: UpdateMessageTemplateDto, @Req() req: any) {
    return this.templatesService.update(id, data, req.user.tenantId, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message template' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.templatesService.remove(id, req.user.tenantId, req.user.id);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render a message template with variables' })
  async render(@Param('id') id: string, @Body() body: RenderTemplateDto, @Req() req: any) {
    return this.templatesService.render(id, body.variables, req.user.tenantId);
  }
}

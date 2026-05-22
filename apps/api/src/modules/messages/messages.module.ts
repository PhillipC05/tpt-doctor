import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessageTemplatesController } from './message-templates.controller';
import { MessagesService } from './messages.service';
import { MessageTemplatesService } from './message-templates.service';

@Module({
  controllers: [MessagesController, MessageTemplatesController],
  providers: [MessagesService, MessageTemplatesService],
  exports: [MessagesService, MessageTemplatesService],
})
export class MessagesModule {}
import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { PdfRendererService } from './pdf-renderer.service.js';

@Module({
  imports: [ApplicationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfRendererService],
  exports: [DocumentsService],
})
export class DocumentsModule {}

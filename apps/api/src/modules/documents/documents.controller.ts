import { Controller, Get, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApplicationAccessGuard } from '../../common/guards/application-access.guard.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { DocumentsService } from './documents.service.js';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('applications/:id')
@UseGuards(ApplicationAccessGuard)
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Post('document/generate')
  @Roles('STAFF', 'ADMIN')
  generate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documents.generate(id, user);
  }

  @Get('document')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { file, stream } = await this.documents.latest(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Post('confirm-signature')
  @Roles('STAFF', 'ADMIN')
  confirmSignature(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.applications
      .getDetail(id)
      .then((app) => this.applications.confirmSignature(app, user));
  }
}

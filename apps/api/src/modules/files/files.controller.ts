import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Application } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ApplicationAccessGuard } from '../../common/guards/application-access.guard.js';
import { FilesService } from './files.service.js';

type ReqWithApp = Request & { application: Application };

@ApiTags('files')
@ApiBearerAuth()
@Controller('applications/:id/files')
@UseGuards(ApplicationAccessGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(@Param('id') id: string) {
    return this.files.list(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: ReqWithApp,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind: string,
    @Body('fieldKey') fieldKey?: string,
  ) {
    const allowed = ['ATTACHMENT', 'GENERATED_DOCUMENT', 'SIGNED_SCAN'];
    const normalized = allowed.includes(kind) ? kind : 'ATTACHMENT';
    return this.files.upload(req.application, user, {
      buffer: file.buffer,
      originalName: file.originalname,
      kind: normalized as 'ATTACHMENT' | 'GENERATED_DOCUMENT' | 'SIGNED_SCAN',
      fieldKey,
    });
  }

  @Get(':fileId')
  async download(
    @Req() req: ReqWithApp,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.files.getForDownload(req.application, fileId);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':fileId')
  @HttpCode(204)
  async remove(
    @Req() req: ReqWithApp,
    @Param('fileId') fileId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.files.remove(req.application, fileId, user);
  }
}

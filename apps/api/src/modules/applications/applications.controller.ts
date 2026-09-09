import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Application } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ApplicationAccessGuard } from '../../common/guards/application-access.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ApplicationsService } from './applications.service.js';
import {
  approveSchema,
  cancelSchema,
  createApplicationSchema,
  listQuerySchema,
  patchApplicationSchema,
  reviewCommentSchema,
  type ApproveDto,
  type CancelDto,
  type CreateApplicationDto,
  type ListQuery,
  type PatchApplicationDto,
  type ReviewCommentDto,
} from './dto/applications.dto.js';

type ReqWithApp = Request & { application: Application };

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.service.list(user, query);
  }

  @Post()
  @Roles('STUDENT', 'ADMIN')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createApplicationSchema)) dto: CreateApplicationDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  @UseGuards(ApplicationAccessGuard)
  get(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Patch(':id')
  @UseGuards(ApplicationAccessGuard)
  patch(
    @Req() req: ReqWithApp,
    @Body(new ZodValidationPipe(patchApplicationSchema)) dto: PatchApplicationDto,
  ) {
    return this.service.patchData(req.application, dto);
  }

  @Post(':id/submit')
  @UseGuards(ApplicationAccessGuard)
  submit(@Req() req: ReqWithApp, @CurrentUser() user: AuthUser) {
    return this.service.submit(req.application, user.id, req.ip);
  }

  @Post(':id/resubmit')
  @UseGuards(ApplicationAccessGuard)
  resubmit(@Req() req: ReqWithApp, @CurrentUser() user: AuthUser) {
    return this.service.resubmit(req.application, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(ApplicationAccessGuard)
  cancel(
    @Req() req: ReqWithApp,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(cancelSchema)) dto: CancelDto,
  ) {
    return this.service.cancel(req.application, user, dto.reason);
  }

  @Get(':id/history')
  @UseGuards(ApplicationAccessGuard)
  history(@Param('id') id: string) {
    return this.service.history(id);
  }

  @Post(':id/stages/:stageId/approve')
  @Roles('STAFF', 'ADMIN')
  @UseGuards(ApplicationAccessGuard)
  approve(
    @Req() req: ReqWithApp,
    @Param('stageId') stageId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(approveSchema)) dto: ApproveDto,
  ) {
    return this.service.approveStage(req.application, stageId, user, dto.comment);
  }

  @Post(':id/stages/:stageId/return')
  @Roles('STAFF', 'ADMIN')
  @UseGuards(ApplicationAccessGuard)
  return_(
    @Req() req: ReqWithApp,
    @Param('stageId') stageId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(reviewCommentSchema)) dto: ReviewCommentDto,
  ) {
    return this.service.returnStage(req.application, stageId, user, dto.comment);
  }

  @Post(':id/stages/:stageId/reject')
  @Roles('STAFF', 'ADMIN')
  @UseGuards(ApplicationAccessGuard)
  reject(
    @Req() req: ReqWithApp,
    @Param('stageId') stageId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(reviewCommentSchema)) dto: ReviewCommentDto,
  ) {
    return this.service.rejectStage(req.application, stageId, user, dto.comment);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ApplicationTypesService } from './application-types.service.js';
import {
  createTypeSchema,
  replaceRouteSchema,
  updateTypeSchema,
  type CreateTypeDto,
  type ReplaceRouteDto,
  type UpdateTypeDto,
} from './dto/application-types.dto.js';

@ApiTags('application-types')
@ApiBearerAuth()
@Controller('application-types')
export class ApplicationTypesController {
  constructor(
    private readonly service: ApplicationTypesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const full = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return this.service.listForUser(full);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createTypeSchema)) dto: CreateTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTypeSchema)) dto: UpdateTypeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(200)
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

  @Put(':id/route')
  @Roles('ADMIN')
  replaceRoute(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replaceRouteSchema)) dto: ReplaceRouteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.replaceRoute(id, dto, user.id);
  }
}

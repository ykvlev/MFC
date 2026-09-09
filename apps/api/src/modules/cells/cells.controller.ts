import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CellsService } from './cells.service.js';

const createCellSchema = z.object({ code: z.string().min(1).max(16), location: z.string().max(255).optional() });
const patchCellSchema = z.object({
  status: z.enum(['FREE', 'OCCUPIED', 'MAINTENANCE']).optional(),
  location: z.string().max(255).optional(),
});

@ApiTags('cells')
@ApiBearerAuth()
@Roles('STAFF', 'ADMIN')
@Controller('cells')
export class CellsController {
  constructor(
    private readonly cells: CellsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.cells.list(status);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body(new ZodValidationPipe(createCellSchema)) dto: z.infer<typeof createCellSchema>) {
    return this.prisma.cell.create({ data: { code: dto.code, location: dto.location } });
  }

  @Patch(':id')
  @Roles('ADMIN')
  patch(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(patchCellSchema)) dto: z.infer<typeof patchCellSchema>,
  ) {
    return this.prisma.cell.update({ where: { id }, data: dto });
  }

  @Post(':id/issue')
  issue(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.cells.issue(id, user.id);
  }

  @Post(':id/open')
  @HttpCode(204)
  async open(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.cells.openLock(id, user.id);
  }
}

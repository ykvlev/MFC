import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AnnouncementsService } from './announcements.service.js';

const createSchema = z
  .object({
    title: z.string().min(1).max(255),
    body: z.string().min(1).max(4000),
    scope: z.enum(['ALL', 'COURSE', 'GROUP']),
    value: z.string().max(64).optional(),
  })
  .refine((v) => v.scope === 'ALL' || !!v.value, {
    message: 'Для курса или группы нужно указать значение',
    path: ['value'],
  });

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.list();
  }

  @Post()
  @Roles('STAFF', 'ADMIN')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createSchema)) dto: z.infer<typeof createSchema>,
  ) {
    return this.announcements.create(user, dto);
  }
}

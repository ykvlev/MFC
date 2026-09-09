import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SlotsService } from './slots.service.js';

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'формат ЧЧ:ММ');

const createWindowSchema = z.object({
  title: z.string().min(1).max(255),
  location: z.string().max(255).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: hhmm,
  endTime: hhmm,
  slotMinutes: z.number().int().min(5).max(240),
  capacity: z.number().int().min(1).max(50),
});

const bookSchema = z.object({
  windowId: z.string().uuid(),
  slotStart: hhmm,
  comment: z.string().max(500).optional(),
});

@ApiTags('slots')
@ApiBearerAuth()
@Controller()
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get('slot-windows')
  listWindows(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.slots.listWindows(user, scope === 'mine' ? 'mine' : 'available');
  }

  @Post('slot-windows')
  @Roles('STAFF', 'TEACHER', 'ADMIN')
  createWindow(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWindowSchema)) dto: z.infer<typeof createWindowSchema>,
  ) {
    return this.slots.createWindow(user, dto);
  }

  @Get('slot-windows/:id/slots')
  slotsOf(@Param('id') id: string) {
    return this.slots.slotsOf(id);
  }

  @Get('slot-bookings')
  myBookings(@CurrentUser() user: AuthUser) {
    return this.slots.myBookings(user);
  }

  @Post('slot-bookings')
  book(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(bookSchema)) dto: z.infer<typeof bookSchema>,
  ) {
    return this.slots.book(user, dto.windowId, dto.slotStart, dto.comment);
  }

  @Post('slot-bookings/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.slots.cancel(user, id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { BookingPeriodsService } from './booking-periods.service.js';
import { BookingsService } from './bookings.service.js';

const periodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  quota: z.number().int().positive(),
  isOpen: z.boolean().optional(),
});
const createBookingSchema = z.object({ applicationId: z.string().uuid(), periodId: z.string().uuid() });

@ApiTags('bookings')
@ApiBearerAuth()
@Controller()
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly periods: BookingPeriodsService,
  ) {}

  @Get('booking-periods')
  listPeriods() {
    return this.periods.listWithFreeSlots();
  }

  @Post('booking-periods')
  @Roles('ADMIN')
  createPeriod(@Body(new ZodValidationPipe(periodSchema)) dto: z.infer<typeof periodSchema>) {
    return this.periods.create(dto);
  }

  @Patch('booking-periods/:id')
  @Roles('ADMIN')
  updatePeriod(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return this.periods.update(id, dto);
  }

  @Get('bookings')
  list(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.bookings.list(user, scope === 'all' ? 'all' : 'my');
  }

  @Post('bookings')
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBookingSchema)) dto: z.infer<typeof createBookingSchema>,
  ) {
    return this.bookings.create(user, dto.applicationId, dto.periodId);
  }

  @Post('bookings/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookings.cancel(user, id);
  }
}

import { Module } from '@nestjs/common';
import { BookingPeriodsService } from './booking-periods.service.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { WaitlistService } from './waitlist.service.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingPeriodsService, WaitlistService],
  exports: [BookingsService],
})
export class BookingsModule {}

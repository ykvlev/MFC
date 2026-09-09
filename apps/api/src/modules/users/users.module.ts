import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersImportService } from './users-import.service.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersImportService],
  exports: [UsersService],
})
export class UsersModule {}

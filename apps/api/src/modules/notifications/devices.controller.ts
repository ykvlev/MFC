import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PushChannel } from './channels/push.channel.js';

const registerSchema = z.object({
  platform: z.enum(['IOS', 'ANDROID']),
  token: z.string().min(1).max(512),
});
const unregisterSchema = z.object({ token: z.string().min(1).max(512) });

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly push: PushChannel) {}

  @Post()
  @HttpCode(204)
  async register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(registerSchema)) dto: z.infer<typeof registerSchema>,
  ): Promise<void> {
    await this.push.register(user.id, dto.platform, dto.token);
  }

  @Delete()
  @HttpCode(204)
  async unregister(
    @Body(new ZodValidationPipe(unregisterSchema)) dto: z.infer<typeof unregisterSchema>,
  ): Promise<void> {
    await this.push.unregister(dto.token);
  }
}

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * ТЗ 12: доступ к заявке.
 * - STUDENT — только своя.
 * - STAFF — если его подразделение есть в маршруте заявки.
 * - ADMIN — всегда.
 * - TEACHER — нет (реестр освобождённых идёт отдельным эндпоинтом).
 *
 * Кладёт заявку в `req.application`, чтобы контроллер не грузил её повторно.
 */
@Injectable()
export class ApplicationAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser;
    const id = req.params.id as string;

    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!application) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Заявка не найдена' });

    req.application = application;

    if (user.role === 'ADMIN') return true;
    if (user.role === 'STUDENT') {
      if (application.userId === user.id) return true;
      throw forbidden();
    }
    if (user.role === 'STAFF') {
      const inRoute = application.stages.some(
        (s) => s.approverDepartment === user.department,
      );
      if (inRoute) return true;
      throw forbidden();
    }
    throw forbidden();
  }
}

function forbidden(): ForbiddenException {
  return new ForbiddenException({
    code: 'ACCESS_DENIED',
    message: 'Нет доступа к этой заявке',
  });
}

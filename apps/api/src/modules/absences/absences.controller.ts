import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AbsencesService, type AbsenceFilter } from './absences.service.js';

function parseFilter(q: Record<string, string | undefined>): AbsenceFilter {
  return {
    group: q.group,
    course: q.course ? Number(q.course) : undefined,
    from: q.from,
    to: q.to,
    q: q.q,
  };
}

@ApiTags('absences')
@ApiBearerAuth()
@Roles('TEACHER', 'ADMIN')
@Controller('absences')
export class AbsencesController {
  constructor(private readonly absences: AbsencesService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.absences.list(parseFilter(query));
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async export(
    @Query() query: Record<string, string | undefined>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.set({ 'Content-Disposition': 'attachment; filename="absences.csv"' });
    return this.absences.exportCsv(parseFilter(query));
  }
}

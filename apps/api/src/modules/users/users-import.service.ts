import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ImportResult {
  created: number;
  updated: number;
  errors: Array<{ line: number; message: string }>;
}

/**
 * Импорт студентов из CSV (ТЗ 1.2, 11.6 `POST /admin/users/import`).
 * Колонки: email,full_name,role,group_name,course,department,is_budget,student_card_no,phone
 * Разделитель — запятая или точка с запятой, первая строка — заголовок.
 */
@Injectable()
export class UsersImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCsv(content: string): Promise<ImportResult> {
    const result: ImportResult = { created: 0, updated: 0, errors: [] };
    const rows = content.split(/\r?\n/).filter((r) => r.trim().length > 0);
    if (rows.length < 2) return result;

    const delimiter = rows[0].includes(';') ? ';' : ',';
    const header = rows[0].split(delimiter).map((h) => h.trim());
    const idx = (name: string) => header.indexOf(name);

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(delimiter).map((c) => c.trim());
      const email = cols[idx('email')]?.toLowerCase();
      const fullName = cols[idx('full_name')];
      const role = cols[idx('role')]?.toUpperCase();
      if (!email || !fullName || !role) {
        result.errors.push({ line: i + 1, message: 'email, full_name и role обязательны' });
        continue;
      }
      if (!['STUDENT', 'STAFF', 'TEACHER', 'ADMIN'].includes(role)) {
        result.errors.push({ line: i + 1, message: `неизвестная роль: ${role}` });
        continue;
      }
      const courseRaw = cols[idx('course')];
      const data = {
        fullName,
        role: role as 'STUDENT' | 'STAFF' | 'TEACHER' | 'ADMIN',
        groupName: cols[idx('group_name')] || null,
        course: courseRaw ? Number(courseRaw) : null,
        department: cols[idx('department')] || null,
        isBudget: /^(1|true|да)$/i.test(cols[idx('is_budget')] ?? ''),
        studentCardNo: cols[idx('student_card_no')] || null,
        phone: cols[idx('phone')] || null,
      };

      try {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
          await this.prisma.user.update({ where: { email }, data });
          result.updated++;
        } else {
          // Временный пароль — пользователь получает его вне системы либо сбрасывает.
          const tempPassword = await argon2.hash(email + Date.now(), { type: argon2.argon2id });
          await this.prisma.user.create({ data: { ...data, email, passwordHash: tempPassword } });
          result.created++;
        }
      } catch (e) {
        result.errors.push({ line: i + 1, message: (e as Error).message });
      }
    }
    return result;
  }
}

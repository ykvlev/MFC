/**
 * Начальные данные — ТЗ раздел 14.
 * Запуск: pnpm --filter @edinoe-okno/api prisma:seed
 */
import { randomInt } from 'node:crypto';
import { PrismaClient, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  'Учебная часть',
  'Студенческое МФЦ',
  'Куратор',
  'Заведующий отделением',
  'Профком',
  'Медпункт',
  'Отдел кадров студентов',
  'Бухгалтерия',
  'Комиссия по заселению',
  'Библиотека',
];

type SeedType = {
  code: string;
  name: string;
  description: string;
  fieldsSchema: Prisma.InputJsonValue;
  accessRule?: Prisma.InputJsonValue;
  requiresSignature?: boolean;
  usesCell?: boolean;
  usesBooking?: boolean;
  documentTemplate?: string;
  route: Array<{
    name: string;
    approverDepartment: string;
    slaDays: number | null;
    isAuto?: boolean;
    parallelGroup?: number;
  }>;
};

const TYPES: SeedType[] = [
  {
    code: 'certificate',
    name: 'Справка об обучении',
    description: 'Для военкомата, соцзащиты, банка. Выдаётся через ячейку.',
    usesCell: true,
    fieldsSchema: [
      { key: 'purpose', label: 'Куда требуется справка', type: 'SELECT', required: true, options: ['Военкомат', 'Соцзащита', 'По месту требования', 'Для банка'], hint: 'Организация-получатель' },
      { key: 'copies', label: 'Количество экземпляров', type: 'NUMBER', required: true, min: 1, max: 5, default: 1 },
      { key: 'comment', label: 'Комментарий', type: 'TEXTAREA', required: false, maxLength: 1000 },
    ],
    route: [
      { name: 'Учебная часть', approverDepartment: 'Учебная часть', slaDays: 2 },
      { name: 'Студенческое МФЦ / печать', approverDepartment: 'Студенческое МФЦ', slaDays: 1 },
    ],
  },
  {
    code: 'sanatorium',
    name: 'Путёвка в профилакторий',
    description: 'Заезды с ограниченной квотой и листом ожидания.',
    usesBooking: true,
    accessRule: { all: [{ field: 'is_budget', op: 'eq', value: true }], denyMessage: 'Запись в профилакторий доступна только студентам бюджетной формы обучения' },
    fieldsSchema: [
      { key: 'health_note', label: 'Справка о здоровье', type: 'FILE', required: false, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 10 },
    ],
    route: [
      { name: 'Проверка права', approverDepartment: 'Комиссия по заселению', slaDays: null, isAuto: true },
      { name: 'Профком', approverDepartment: 'Профком', slaDays: 3 },
      { name: 'Медпункт', approverDepartment: 'Медпункт', slaDays: 3 },
    ],
  },
  {
    code: 'absence',
    name: 'Освобождение от занятий',
    description: 'Соревнования, олимпиады, конференции. Нужна офлайн-подпись.',
    requiresSignature: true,
    documentTemplate: 'absence.html',
    fieldsSchema: [
      { key: 'period', label: 'Период освобождения', type: 'DATE_RANGE', required: true, minDate: 'today' },
      { key: 'reason', label: 'Основание', type: 'SELECT', required: true, options: ['Соревнования', 'Олимпиада', 'Конференция', 'Иное'] },
      { key: 'call_letter', label: 'Письмо-вызов', type: 'FILE', required: true, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 10 },
      { key: 'comment', label: 'Комментарий', type: 'TEXTAREA', required: false, maxLength: 1000 },
    ],
    route: [
      { name: 'Куратор', approverDepartment: 'Куратор', slaDays: 1 },
      { name: 'Заведующий отделением', approverDepartment: 'Заведующий отделением', slaDays: 2 },
      { name: 'Загрузка подписанного скана', approverDepartment: 'Заведующий отделением', slaDays: 1 },
    ],
  },
  {
    code: 'dormitory',
    name: 'Заявление на общежитие',
    description: 'Рассматривается комиссией по заселению.',
    fieldsSchema: [
      { key: 'family_status', label: 'Семейное положение', type: 'SELECT', required: true, options: ['Не в браке', 'В браке', 'Есть дети'] },
      { key: 'documents', label: 'Документы', type: 'FILE', required: true, multiple: true, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 10 },
      { key: 'comment', label: 'Комментарий', type: 'TEXTAREA', required: false, maxLength: 1000 },
    ],
    route: [
      { name: 'Учебная часть', approverDepartment: 'Учебная часть', slaDays: 3 },
      { name: 'Комиссия по заселению', approverDepartment: 'Комиссия по заселению', slaDays: 10 },
    ],
  },
  {
    code: 'student_card',
    name: 'Пропуск / дубликат студенческого',
    description: 'Утеря или порча. Выдаётся через ячейку.',
    usesCell: true,
    fieldsSchema: [
      { key: 'reason', label: 'Причина', type: 'SELECT', required: true, options: ['Утеря', 'Порча', 'Первичное получение'] },
      { key: 'photo', label: 'Фотография', type: 'FILE', required: true, accept: ['jpg', 'jpeg', 'png'], maxSizeMb: 10 },
    ],
    route: [
      { name: 'Учебная часть', approverDepartment: 'Учебная часть', slaDays: 2 },
      { name: 'Отдел кадров студентов', approverDepartment: 'Отдел кадров студентов', slaDays: 3 },
      { name: 'Печать', approverDepartment: 'Студенческое МФЦ', slaDays: 2 },
    ],
  },
  {
    code: 'financial_aid',
    name: 'Материальная помощь',
    description: 'Профком и бухгалтерия, срок до 12 дней.',
    fieldsSchema: [
      { key: 'reason', label: 'Обоснование', type: 'TEXTAREA', required: true, maxLength: 2000 },
      { key: 'documents', label: 'Подтверждающие документы', type: 'FILE', required: true, multiple: true, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 10 },
    ],
    route: [
      { name: 'Куратор', approverDepartment: 'Куратор', slaDays: 2 },
      { name: 'Профком', approverDepartment: 'Профком', slaDays: 5 },
      { name: 'Бухгалтерия', approverDepartment: 'Бухгалтерия', slaDays: 5 },
    ],
  },
  {
    code: 'medical_note',
    name: 'Пропуск по болезни',
    description: 'Один этап: куратор группы.',
    fieldsSchema: [
      { key: 'period', label: 'Период пропуска', type: 'DATE_RANGE', required: true },
      { key: 'medical_certificate', label: 'Медицинская справка', type: 'FILE', required: true, accept: ['pdf', 'jpg', 'jpeg', 'png'], maxSizeMb: 10 },
    ],
    route: [{ name: 'Куратор', approverDepartment: 'Куратор', slaDays: 1 }],
  },
  {
    // Расширение сверх ТЗ: параллельный маршрут — все отделы согласуют одновременно.
    code: 'bypass',
    name: 'Обходной лист',
    description: 'При выпуске, отчислении или переводе. Отметки об отсутствии задолженностей.',
    fieldsSchema: [
      {
        key: 'reason',
        label: 'Основание',
        type: 'SELECT',
        required: true,
        options: ['Выпуск', 'Отчисление', 'Перевод в другой вуз', 'Академический отпуск'],
      },
      { key: 'comment', label: 'Комментарий', type: 'TEXTAREA', required: false, maxLength: 1000 },
    ],
    route: [
      { name: 'Библиотека', approverDepartment: 'Библиотека', slaDays: 2, parallelGroup: 1 },
      { name: 'Общежитие', approverDepartment: 'Комиссия по заселению', slaDays: 2, parallelGroup: 1 },
      { name: 'Бухгалтерия', approverDepartment: 'Бухгалтерия', slaDays: 3, parallelGroup: 1 },
      { name: 'Военно-учётный стол', approverDepartment: 'Отдел кадров студентов', slaDays: 3, parallelGroup: 1 },
      { name: 'Спортклуб', approverDepartment: 'Профком', slaDays: 2, parallelGroup: 1 },
      { name: 'Учебная часть — закрытие обходного', approverDepartment: 'Учебная часть', slaDays: 2 },
    ],
  },
];

async function main(): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD не задан (ТЗ раздел 18)');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@university.local';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword, { type: argon2.argon2id }),
      fullName: 'Администратор системы',
      role: 'ADMIN',
    },
  });

  // Сотрудники — по одному на подразделение.
  for (const dept of DEPARTMENTS) {
    const email = `staff.${translit(dept)}@university.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await argon2.hash('staff12345', { type: argon2.argon2id }),
        fullName: `Сотрудник · ${dept}`,
        role: 'STAFF',
        department: dept,
      },
    });
  }

  // Преподаватели.
  for (let i = 1; i <= 2; i++) {
    const email = `teacher${i}@university.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await argon2.hash('teacher12345', { type: argon2.argon2id }),
        fullName: `Преподаватель ${i}`,
        role: 'TEACHER',
      },
    });
  }

  // Студенты: 5 бюджет, 5 внебюджет.
  for (let i = 1; i <= 10; i++) {
    const email = `student${i}@student.local`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: await argon2.hash('student12345', { type: argon2.argon2id }),
        fullName: `Студент ${i}`,
        role: 'STUDENT',
        groupName: i % 2 === 0 ? 'ИС-21' : 'ПМ-32',
        course: (i % 4) + 1,
        isBudget: i <= 5,
        studentCardNo: `21-0${1000 + i}`,
      },
    });
  }

  // Типы заявок + маршруты.
  for (let idx = 0; idx < TYPES.length; idx++) {
    const t = TYPES[idx];
    const type = await prisma.applicationType.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        description: t.description,
        fieldsSchema: t.fieldsSchema,
        accessRule: t.accessRule ?? undefined,
        requiresSignature: t.requiresSignature ?? false,
        usesCell: t.usesCell ?? false,
        usesBooking: t.usesBooking ?? false,
        documentTemplate: t.documentTemplate ?? null,
        sortOrder: idx,
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        fieldsSchema: t.fieldsSchema,
        accessRule: t.accessRule ?? undefined,
        requiresSignature: t.requiresSignature ?? false,
        usesCell: t.usesCell ?? false,
        usesBooking: t.usesBooking ?? false,
        documentTemplate: t.documentTemplate ?? null,
        sortOrder: idx,
      },
    });

    await prisma.routeStep.deleteMany({ where: { typeId: type.id } });
    await prisma.routeStep.createMany({
      data: t.route.map((s, i) => ({
        typeId: type.id,
        orderNum: i + 1,
        name: s.name,
        approverDepartment: s.approverDepartment,
        isAuto: s.isAuto ?? false,
        slaDays: s.slaDays,
        parallelGroup: s.parallelGroup ?? null,
      })),
    });
  }

  // 40 ячеек A-01..A-20, B-01..B-20.
  for (const letter of ['A', 'B']) {
    for (let i = 1; i <= 20; i++) {
      const code = `${letter}-${String(i).padStart(2, '0')}`;
      await prisma.cell.upsert({
        where: { code },
        update: {},
        create: { code, location: '1 этаж, холл главного корпуса', status: 'FREE' },
      });
    }
  }

  // 3 периода заездов.
  const periods = [
    { name: 'Заезд №3, март', start: '2026-03-10', end: '2026-03-24', quota: 25 },
    { name: 'Заезд №4, апрель', start: '2026-04-07', end: '2026-04-21', quota: 30 },
    { name: 'Заезд №5, май', start: '2026-05-12', end: '2026-05-26', quota: 25 },
  ];
  for (const p of periods) {
    const exists = await prisma.bookingPeriod.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.bookingPeriod.create({
        data: {
          name: p.name,
          startDate: new Date(p.start),
          endDate: new Date(p.end),
          quota: p.quota,
        },
      });
    }
  }

  console.log('Seed завершён.');
  void randomInt; // зарезервировано для демо-заявок (ТЗ 14 п.7) на этапе 3
  void translit;
}

function translit(s: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya', ' ': '-',
  };
  return s
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

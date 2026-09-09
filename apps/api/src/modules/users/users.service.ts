import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateUserDto, ListUsersQuery, UpdateUserDto } from './dto/users.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private strip<T extends { passwordHash: string }>(u: T) {
    const { passwordHash: _o, ...rest } = u;
    return rest;
  }

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((u) => this.strip(u)), total, page: query.page, limit: query.limit };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Email уже занят' });
    const { password, ...rest } = dto;
    const user = await this.prisma.user.create({
      data: { ...rest, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) },
    });
    return this.strip(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Пользователь не найден' });
    });
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.strip(user);
  }
}

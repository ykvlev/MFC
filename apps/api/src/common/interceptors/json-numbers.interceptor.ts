import { Injectable, type CallHandler, type NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

// Prisma stores file sizes as bigint; Express JSON cannot serialize bigint.
function jsonNumbers(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value.toString();
  }
  if (Array.isArray(value)) return value.map(jsonNumbers);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonNumbers(child)]));
  }
  // Preserve Date, Buffer and StreamableFile instances.
  return value;
}

@Injectable()
export class JsonNumbersInterceptor implements NestInterceptor {
  intercept(_context: unknown, next: CallHandler) {
    return next.handle().pipe(map(jsonNumbers));
  }
}

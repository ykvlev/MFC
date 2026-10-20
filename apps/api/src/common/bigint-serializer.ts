/**
 * JSON.stringify не умеет сериализовать BigInt и роняет ответ 500.
 * В схеме BigInt используется для files.size_bytes и event_log.id, поэтому
 * учим BigInt отдаваться числом во всех JSON-ответах приложения.
 *
 * Значения заведомо в пределах Number.MAX_SAFE_INTEGER (размеры файлов и
 * автоинкрементные id журнала), потеря точности не грозит.
 *
 * Импортируется ради side-effect в AppModule — так патч применяется и при
 * обычном старте (main.ts), и в интеграционных тестах, которые поднимают
 * AppModule напрямую.
 */
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (
  this: bigint,
): number {
  return Number(this);
};

export {};

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class VaultService {
  private readonly algorithm = 'aes-256-gcm';
  // Берем секрет из .env или используем тестовый дефолт
  private readonly secretKey = Buffer.from(
    process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex',
  );


  generateHmacSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('hex');
  }

  // Валидация подписи транзакции
  verifyHmacSignature(data: string, signature: string): boolean {
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const expectedSignature = this.generateHmacSignature(data);
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }
}
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
    const expectedSignature = this.generateHmacSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  }
}
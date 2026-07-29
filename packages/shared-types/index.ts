// 1. Модель Цифровой Подарочной Карты
export interface DigitalGiftCard {
  id: string;
  maskedCardNumber: string; // "**** **** **** 8888"
  currentCardValue: number;  // Остаток/номинал
  currency: 'CNY' | 'RUB';
  status: 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
  expiryDate: string;
}

// 2. Запрос на списание по QR-коду
export interface VoucherRedemptionRequest {
  cardId: string;
  rawQrData: string;         // Токен из кассового QR
  merchantName?: string;
  amountCNY: number;
}

// 3. Ответ от сервера после списания
export interface VoucherRedemptionResponse {
  success: boolean;
  transactionId: string;
  remainingBalance: number;
  timestamp: string;
  error?: string;
}

// 4. История транзакций
export interface CardUsageHistory {
  id: string;
  cardId: string;
  retailPartnerName: string;
  amount: number;
  currency: 'CNY' | 'RUB';
  createdAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}
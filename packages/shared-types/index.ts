// Единые типы данных для WeChat Mini-App и NestJS Backend

export interface User {
  id: string;
  openId: string;
  createdAt: Date;
}

export interface DigitizedCard {
  id: string;
  userId: string;
  nominalRub: number;
  balanceRub: number;
  encryptedToken: string;
}

export interface Transaction {
  id: string;
  cardId: string;
  amountRub: number;
  amountCny: number;
  merchantName: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: Date;
}

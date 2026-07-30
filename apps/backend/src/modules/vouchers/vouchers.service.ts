// apps/backend/src/modules/vouchers/vouchers.service.ts
import { Injectable } from '@nestjs/common';

export interface Brand {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
}

export interface GiftCardTemplate {
  id: string;
  brandId: string;
  title: string;
  amountRUB: number;
  priceCNY: number;
  isSet: boolean; // Флаг: одиночная карта или сет карт
}

@Injectable()
export class VouchersService {
  // Временный mock-каталог брендов
  private brands: Brand[] = [
    { id: 'b1', name: 'Перекрёсток', logoUrl: '/assets/perekrestok.png', category: 'Супермаркеты' },
    { id: 'b2', name: 'Ашан', logoUrl: '/assets/auchan.png', category: 'Гипермаркеты' },
  ];

  // Временный mock-каталог шаблонов карт
  private templates: GiftCardTemplate[] = [
    { id: 't1', brandId: 'b1', title: 'Перекрёсток 1 000 ₽', amountRUB: 1000, priceCNY: 82, isSet: false },
    { id: 't2', brandId: 'b1', title: 'Перекрёсток 3 000 ₽', amountRUB: 3000, priceCNY: 245, isSet: false },
    { id: 't3', brandId: 'b2', title: 'Ашан 2 000 ₽', amountRUB: 2000, priceCNY: 164, isSet: false },
    { id: 't4', brandId: 'b1', title: 'Туристический Сет (Перекрёсток + Ашан)', amountRUB: 5000, priceCNY: 410, isSet: true },
  ];

  // Метод получения каталога для Витрины
  getCatalog() {
    return {
      brands: this.brands,
      templates: this.templates,
    };
  }

  // Метод получения купленных карт пользователя
  getUserCards(userId: string) {
    return this.userVouchers;
  }

  // Хранилище купленных ваучеров в памяти (пока нет БД)
  private userVouchers = [
    {
      id: 'v-101',
      cardName: 'Перекрёсток VIP Card',
      balanceRUB: 3000,
      balanceCNY: 245,
      cardNumber: '**** 8892',
      status: 'ACTIVE',
    }
  ];

  // Новый метод для покупки карты/сета
  buyVoucher(templateId: string) {
  const template = this.templates.find((t) => t.id === templateId);
  if (!template) {
    throw new Error('Шаблон карты не найден');
  }

  const newVoucher = {
    id: `v-${Date.now()}`,
    cardName: template.title,
    balanceRUB: template.amountRUB,
    balanceCNY: template.priceCNY,
    cardNumber: `**** ${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'ACTIVE',
  };

  this.userVouchers.push(newVoucher);

  return {
    success: true,
    message: 'Ваучер успешно куплен!',
    voucher: newVoucher,
  };
}
}
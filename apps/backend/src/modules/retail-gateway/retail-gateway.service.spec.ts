import { BadRequestException } from '@nestjs/common';
import { RetailGatewayService } from './retail-gateway.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { VaultService } from '../security-vault/vault.service';

describe('RetailGatewayService', () => {
  it('uses only cards that belong to the merchant encoded in the QR payload', async () => {
    const vouchersService = {
      getUserCards: jest.fn().mockResolvedValue([
        { id: 'card-1', status: 'ACTIVE', balanceRUB: 1000, merchantId: 'perekrestok' },
        { id: 'card-2', status: 'ACTIVE', balanceRUB: 1000, merchantId: 'auchan' },
      ]),
      updateCardBalance: jest.fn().mockResolvedValue({ success: true }),
    } as unknown as VouchersService;

    const vaultService = {
      verifyHmacSignature: jest.fn().mockReturnValue(true),
      generateHmacSignature: jest.fn().mockReturnValue('sig-demo'),
    } as unknown as VaultService;

    const service = new RetailGatewayService(vouchersService, vaultService);

    const result = await service.processSbpPayment('perekrestok-qr', 'demo-user', 'sig-demo');

    expect(result.success).toBe(true);
    expect(result.transaction.merchantName).toBe('Перекрёсток (Москва, ТЦ Цветной)');
    expect(vouchersService.updateCardBalance).toHaveBeenCalledWith('card-1', expect.any(Number));
  });

  it('fails when there is no card for the merchant encoded in the QR payload', async () => {
    const vouchersService = {
      getUserCards: jest.fn().mockResolvedValue([
        { id: 'card-2', status: 'ACTIVE', balanceRUB: 1000, merchantId: 'auchan' },
      ]),
      updateCardBalance: jest.fn(),
    } as unknown as VouchersService;

    const vaultService = {
      verifyHmacSignature: jest.fn().mockReturnValue(true),
      generateHmacSignature: jest.fn().mockReturnValue('sig-demo'),
    } as unknown as VaultService;

    const service = new RetailGatewayService(vouchersService, vaultService);

    await expect(service.processSbpPayment('perekrestok-qr', 'demo-user', 'sig-demo')).rejects.toThrow(BadRequestException);
    expect(vouchersService.updateCardBalance).not.toHaveBeenCalled();
  });
});

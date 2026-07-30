import { RetailGatewayController } from './retail-gateway.controller';

describe('RetailGatewayController', () => {
  it('forwards QR payment requests to the retail gateway service', async () => {
    const processSbpPayment = jest.fn().mockResolvedValue({
      success: true,
      transaction: { id: 'tx-1', amountRUB: 450 },
      remainingBalanceRUB: 2550,
    });

    const controller = new RetailGatewayController({ processSbpPayment } as any);

    const result = await controller.payViaSbp({ qrData: 'qr-demo', signature: 'sig-demo' });

    expect(processSbpPayment).toHaveBeenCalledWith('qr-demo', 'user-demo-1', 'sig-demo');
    expect(result.success).toBe(true);
  });
});

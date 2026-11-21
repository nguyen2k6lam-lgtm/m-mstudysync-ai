import crypto from 'crypto';

export interface PaymentCreationParams {
  userId: string;
  userEmail: string;
  plan: 'premium_monthly' | 'premium_yearly';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  orderId: string;
  returnUrl: string;
  notifyUrl: string;
  clientIp?: string;
}

export interface PaymentCreationResult {
  success: boolean;
  orderId: string;
  payUrl: string;
  qrCodeUrl?: string;
  deeplink?: string;
  provider: 'momo' | 'zalopay';
  mode: 'sandbox' | 'production' | 'simulation';
  message: string;
  rawResponse?: any;
}

// ====================================================================
// MoMo Payment Provider (AIO - All In One Gateway)
// ====================================================================

export class MoMoPaymentProvider {
  private partnerCode: string;
  private accessKey: string;
  private secretKey: string;
  private endpoint: string;

  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO_SANDBOX';
    this.accessKey = process.env.MOMO_ACCESS_KEY || 'MOMO_ACCESS_KEY';
    this.secretKey = process.env.MOMO_SECRET_KEY || 'MOMO_SECRET_KEY';
    this.endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
  }

  generateSignature(rawString: string): string {
    return crypto.createHmac('sha256', this.secretKey).update(rawString).digest('hex');
  }

  async createPayment(params: PaymentCreationParams): Promise<PaymentCreationResult> {
    const { orderId, amount, plan, userId, returnUrl, notifyUrl } = params;
    const orderInfo = `StudySync AI Premium (${plan === 'premium_yearly' ? 'Gói 1 Năm' : 'Gói 1 Tháng'}) - Sinh viên: ${userId}`;
    const requestId = `${orderId}_${Date.now()}`;
    const requestType = 'captureWallet';
    const extraData = Buffer.from(JSON.stringify({ userId, plan, orderId })).toString('base64');

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = this.generateSignature(rawSignature);

    const payload = {
      partnerCode: this.partnerCode,
      partnerName: 'StudySync AI',
      storeId: 'StudySyncStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: 'vi',
      extraData,
      requestType,
      signature,
    };

    // If live credentials are provided and not default mock keys, attempt real MoMo API call
    const isLiveConfig =
      process.env.MOMO_SECRET_KEY &&
      process.env.MOMO_SECRET_KEY !== 'MOMO_SANDBOX_SECRET_KEY' &&
      process.env.MOMO_SECRET_KEY !== 'MOMO_SECRET_KEY';

    if (isLiveConfig) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json();
        if (data && (data.resultCode === 0 || data.payUrl)) {
          return {
            success: true,
            orderId,
            payUrl: data.payUrl,
            qrCodeUrl: data.qrCodeUrl || data.payUrl,
            deeplink: data.deeplink,
            provider: 'momo',
            mode: 'production',
            message: 'Đã tạo liên kết thanh toán MoMo thành công.',
            rawResponse: data,
          };
        }
        console.warn('[MoMo Gateway Warning]', data);
      } catch (err: any) {
        console.warn('[MoMo Gateway Network Error]', err.message);
      }
    }

    // MoMo Sandbox / Test Simulation fallback (Hình 2 QR Code)
    const simulatedPayUrl = `${returnUrl}&payment_provider=momo&orderId=${orderId}&amount=${amount}&status=simulated`;
    const simulatedQrCode = process.env.PAYMENT_MOMO_QR_IMAGE_URL || '/images/momo_qr.png';

    return {
      success: true,
      orderId,
      payUrl: simulatedPayUrl,
      qrCodeUrl: simulatedQrCode,
      deeplink: `momo://pay?amount=${amount}&orderId=${orderId}`,
      provider: 'momo',
      mode: 'sandbox',
      message: 'Đã tạo mã đơn hàng MoMo Sandbox thành công.',
    };
  }

  verifyCallback(body: any): {
    isValid: boolean;
    orderId?: string;
    transId?: string;
    amount?: number;
    resultCode?: number;
    message?: string;
    extraData?: string;
  } {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = body;

      // Check essential fields
      if (!orderId || resultCode === undefined) {
        return { isValid: false, message: 'Dữ liệu IPN thiếu thông tin bắt buộc.' };
      }

      // If running with configured secret key, check HMAC
      const isLiveConfig =
        process.env.MOMO_SECRET_KEY &&
        process.env.MOMO_SECRET_KEY !== 'MOMO_SANDBOX_SECRET_KEY' &&
        process.env.MOMO_SECRET_KEY !== 'MOMO_SECRET_KEY';

      if (isLiveConfig && signature) {
        const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        const calculatedSignature = this.generateSignature(rawSignature);
        if (calculatedSignature !== signature) {
          return { isValid: false, message: 'Chữ ký MoMo không hợp lệ (Signature mismatch).' };
        }
      }

      return {
        isValid: true,
        orderId,
        transId: String(transId || `momo_trans_${Date.now()}`),
        amount: Number(amount),
        resultCode: Number(resultCode),
        message: String(message || 'Giao dịch thành công'),
        extraData,
      };
    } catch (err: any) {
      return { isValid: false, message: 'Lỗi giải mã callback: ' + err.message };
    }
  }
}

// ====================================================================
// ZaloPay Payment Provider (v2 API)
// ====================================================================

export class ZaloPayPaymentProvider {
  private appId: string;
  private key1: string;
  private key2: string;
  private endpoint: string;

  constructor() {
    this.appId = process.env.ZALOPAY_APP_ID || '2554';
    this.key1 = process.env.ZALOPAY_KEY1 || 'sdngKKJmqEMzvh5QQwuqbu7FS3nvfrqE';
    this.key2 = process.env.ZALOPAY_KEY2 || 'trMrHtvjoKMvXeEtCL8W9ywKyAEListen';
    this.endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
  }

  generateMac(data: string, key: string): string {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  async createPayment(params: PaymentCreationParams): Promise<PaymentCreationResult> {
    const { orderId, amount, plan, userId, returnUrl, notifyUrl } = params;
    const transTime = Date.now();

    // Format app_trans_id: YYMMDD_xxxx
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const appTransId = `${yy}${mm}${dd}_${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`;

    const embedData = JSON.stringify({
      redirecturl: returnUrl,
      userId,
      plan,
      orderId,
    });
    const items = JSON.stringify([
      {
        itemid: plan,
        itemname: `StudySync AI Premium (${plan === 'premium_yearly' ? '1 Năm' : '1 Tháng'})`,
        itemprice: amount,
        itemquantity: 1,
      },
    ]);
    const description = `StudySync AI - Thanh toan Premium ${orderId}`;

    const rawData = `${this.appId}|${appTransId}|${userId}|${amount}|${transTime}|${embedData}|${items}`;
    const mac = this.generateMac(rawData, this.key1);

    const orderPayload = {
      app_id: parseInt(this.appId, 10),
      app_trans_id: appTransId,
      app_user: userId,
      app_time: transTime,
      item: items,
      embed_data: embedData,
      amount,
      description,
      bank_code: '',
      callback_url: notifyUrl,
      mac,
    };

    const isLiveConfig =
      process.env.ZALOPAY_KEY1 &&
      process.env.ZALOPAY_KEY1 !== 'sdngKKJmqEMzvh5QQwuqbu7FS3nvfrqE';

    if (isLiveConfig) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });

        const data: any = await response.json();
        if (data && data.return_code === 1) {
          return {
            success: true,
            orderId,
            payUrl: data.order_url,
            qrCodeUrl: data.qr_code || data.order_url,
            deeplink: data.zp_trans_token,
            provider: 'zalopay',
            mode: 'production',
            message: 'Đã tạo đơn hàng ZaloPay thành công.',
            rawResponse: data,
          };
        }
        console.warn('[ZaloPay Gateway Warning]', data);
      } catch (err: any) {
        console.warn('[ZaloPay Gateway Network Error]', err.message);
      }
    }

    // ZaloPay Sandbox / Test Simulation fallback (Hình 1 QR Code)
    const simulatedPayUrl = `${returnUrl}&payment_provider=zalopay&orderId=${orderId}&amount=${amount}&status=simulated`;
    const simulatedQrCode = process.env.PAYMENT_ZALOPAY_QR_IMAGE_URL || '/images/zalopay_qr.png';

    return {
      success: true,
      orderId,
      payUrl: simulatedPayUrl,
      qrCodeUrl: simulatedQrCode,
      deeplink: `zalopay://pay?trans_id=${appTransId}`,
      provider: 'zalopay',
      mode: 'sandbox',
      message: 'Đã tạo mã đơn hàng ZaloPay Sandbox thành công.',
    };
  }

  verifyCallback(body: any): {
    isValid: boolean;
    orderId?: string;
    appTransId?: string;
    amount?: number;
    userId?: string;
    message?: string;
  } {
    try {
      const { data: dataStr, mac } = body;
      if (!dataStr || !mac) {
        return { isValid: false, message: 'Thiếu dữ liệu callback ZaloPay (data hoặc mac).' };
      }

      // Verify MAC using key2
      const calculatedMac = this.generateMac(dataStr, this.key2);
      if (calculatedMac !== mac) {
        return { isValid: false, message: 'Chữ ký MAC ZaloPay không hợp lệ (MAC mismatch).' };
      }

      const dataObj = JSON.parse(dataStr);
      let parsedEmbed: any = {};
      try {
        parsedEmbed = JSON.parse(dataObj.embed_data || '{}');
      } catch {}

      return {
        isValid: true,
        orderId: parsedEmbed.orderId || dataObj.app_trans_id,
        appTransId: dataObj.app_trans_id,
        amount: Number(dataObj.amount),
        userId: dataObj.app_user || parsedEmbed.userId,
        message: 'Xác thực callback ZaloPay thành công.',
      };
    } catch (err: any) {
      return { isValid: false, message: 'Lỗi giải mã callback ZaloPay: ' + err.message };
    }
  }
}

// Singleton instances
export const momoProvider = new MoMoPaymentProvider();
export const zalopayProvider = new ZaloPayPaymentProvider();

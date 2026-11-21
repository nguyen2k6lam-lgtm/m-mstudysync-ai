import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  apiGetTransactionStatus,
  apiSimulateMoMoPayment,
  apiSimulateZaloPayPayment,
} from '../../services/api';
import {
  QrCode,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    provider: 'momo' | 'zalopay';
    orderId: string;
    transactionId: string;
    amount: number;
    plan: string;
    payUrl: string;
    qrCodeUrl?: string;
    mode: string;
  } | null;
  onSuccess?: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderData,
  onSuccess,
}) => {
  const { refreshUserData, showToast, setActiveTab, language } = useApp();
  const isEn = language === 'en';

  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [polling, setPolling] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderData) {
      setStatus('pending');
      setPolling(false);
      return;
    }

    setStatus('pending');
    let isCancelled = false;

    // Start status polling every 3 seconds
    const interval = setInterval(async () => {
      if (isCancelled || status === 'paid') return;
      try {
        setPolling(true);
        const res = await apiGetTransactionStatus(orderData.orderId);
        if (res.status === 'paid' || res.isPremium) {
          setStatus('paid');
          clearInterval(interval);
          if (refreshUserData) await refreshUserData();
          showToast(
            isEn
              ? '🎉 Payment successful! StudySync AI Premium is now active.'
              : '🎉 Thanh toán thành công! Gói StudySync AI Premium đã được kích hoạt.',
            'success'
          );
          if (onSuccess) onSuccess();
        } else if (res.status === 'failed') {
          setStatus('failed');
          clearInterval(interval);
        }
      } catch (err) {
        // Silent poll error
      } finally {
        if (!isCancelled) setPolling(false);
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, orderData]);

  if (!orderData) return null;

  const isMoMo = orderData.provider === 'momo';
  const providerTitle = isMoMo
    ? isEn
      ? 'MoMo E-Wallet'
      : 'Ví điện tử MoMo'
    : isEn
    ? 'ZaloPay E-Wallet'
    : 'Ví điện tử ZaloPay';
  const providerColor = isMoMo ? 'from-pink-600 to-rose-600' : 'from-blue-600 to-cyan-600';
  const providerBorder = isMoMo ? 'border-pink-500/30' : 'border-blue-500/30';
  const providerBg = isMoMo ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';

  const formattedAmount = new Intl.NumberFormat(isEn ? 'en-US' : 'vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(orderData.amount);

  const planLabel = orderData.plan.includes('yearly')
    ? isEn
      ? 'StudySync Premium (1-Year Plan)'
      : 'StudySync Premium (Gói 1 Năm)'
    : isEn
    ? 'StudySync Premium (1-Month Plan)'
    : 'StudySync Premium (Gói 1 Tháng)';

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderData.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      if (isMoMo) {
        await apiSimulateMoMoPayment(orderData.orderId);
      } else {
        await apiSimulateZaloPayPayment(orderData.orderId);
      }
      setStatus('paid');
      if (refreshUserData) await refreshUserData();
      showToast(
        isEn
          ? '🎉 Sandbox payment confirmed successfully!'
          : '🎉 Đã xác nhận thanh toán thành công qua Sandbox!',
        'success'
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(
        err.message || (isEn ? 'Failed to simulate payment.' : 'Không thể mô phỏng thanh toán.'),
        'error'
      );
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg">
      <div className="pt-2">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-linear-to-r ${providerColor} flex items-center justify-center text-white font-black text-sm shadow-md`}>
              {isMoMo ? 'Mo' : 'ZLP'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEn ? `Pay via ${providerTitle}` : `Thanh toán qua ${providerTitle}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn ? 'Order ID: ' : 'Mã đơn hàng: '}
                <span className="font-mono font-semibold">{orderData.orderId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleCopyOrderId}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Copy order ID' : 'Sao chép mã đơn hàng'}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Content based on Status */}
        {status === 'paid' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {isEn ? 'Payment Successful!' : 'Thanh toán thành công!'}
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {isEn
                  ? `${planLabel} has been activated on your account.`
                  : `Gói ${planLabel} đã được kích hoạt trên tài khoản của bạn.`}
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 max-w-sm mx-auto text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? 'Transaction ID:' : 'Mã giao dịch:'}</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{orderData.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? 'Amount:' : 'Số tiền:'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formattedAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? 'Payment Gateway:' : 'Cổng thanh toán:'}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{providerTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isEn ? 'Activated At:' : 'Thời gian kích hoạt:'}</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {new Date().toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  setActiveTab('dashboard');
                }}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                <span>{isEn ? 'Enter Study Workspace' : 'Vào không gian học tập'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEn ? 'Transaction Unsuccessful' : 'Giao dịch chưa thành công'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isEn
                  ? 'The transaction was declined or timed out.'
                  : 'Giao dịch đã bị từ chối hoặc hết thời gian chờ thanh toán.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isEn ? 'Close & Try Again' : 'Đóng và thử lại'}
            </button>
          </div>
        ) : (
          /* Pending State */
          <div className="py-4 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* QR Code Column */}
              <div className="text-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="relative inline-block p-2 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
                  <img
                    src={
                      orderData.qrCodeUrl && !orderData.qrCodeUrl.includes('api.qrserver.com')
                        ? orderData.qrCodeUrl
                        : isMoMo
                        ? '/images/momo_qr.png'
                        : '/images/zalopay_qr.png'
                    }
                    alt={isMoMo ? 'QR Code MoMo' : 'QR Code ZaloPay'}
                    className="w-48 h-auto max-h-56 mx-auto object-contain rounded-xl"
                  />
                  {polling && (
                    <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-indigo-600 animate-ping" />
                  )}
                  <a
                    href={isMoMo ? '/images/momo_qr.png' : '/images/zalopay_qr.png'}
                    download={`QR_${isMoMo ? 'MoMo' : 'ZaloPay'}_${orderData.orderId}.png`}
                    className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline block"
                  >
                    {isEn
                      ? `Download ${isMoMo ? 'MoMo' : 'ZaloPay'} QR Code`
                      : `Tải ảnh mã QR ${isMoMo ? 'MoMo' : 'ZaloPay'} về máy`}
                  </a>
                </div>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>
                    {isEn ? 'Waiting for QR scan...' : 'Đang chờ bạn quét mã QR...'}
                  </span>
                </div>
              </div>

              {/* Order Details & Direct Link Column */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 text-xs">
                  <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isEn ? 'Subscription Plan:' : 'Gói đăng ký:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{planLabel}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isEn ? 'Payment Amount:' : 'Số tiền thanh toán:'}</span>
                    <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                      {formattedAmount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isEn ? 'Environment:' : 'Môi trường:'}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                      {orderData.mode || 'Sandbox'}
                    </span>
                  </div>
                </div>

                {/* Direct Pay Link Button (if opening app directly on phone) */}
                <a
                  href={orderData.payUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 px-4 rounded-xl bg-linear-to-r ${providerColor} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-90`}
                >
                  <span>
                    {isEn
                      ? `Open ${isMoMo ? 'MoMo' : 'ZaloPay'} App`
                      : `Mở ứng dụng ${isMoMo ? 'MoMo' : 'ZaloPay'}`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Sandbox Simulation Button (Essential for testers / judges without real VN e-wallets) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>{isEn ? 'Sandbox Testing Mode' : 'Kiểm thử chế độ Sandbox'}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                      {isEn
                        ? 'Safe testing mode: Click below to trigger server webhook callback and activate Premium immediately.'
                        : 'Chế độ kiểm thử an toàn: Bấm nút dưới để kích hoạt callback máy chủ và nâng cấp gói Premium ngay lập tức.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulatePayment}
                      disabled={simulating}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      {simulating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{isEn ? 'Verifying webhook...' : 'Đang xác nhận webhook...'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>
                            {isEn ? 'Confirm Payment Now (Sandbox)' : 'Xác nhận thanh toán ngay (Sandbox)'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

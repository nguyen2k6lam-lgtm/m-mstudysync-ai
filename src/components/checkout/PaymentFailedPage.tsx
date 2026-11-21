import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetOrder, ClientOrder } from '../../services/api';
import {
  XCircle,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Crown,
} from 'lucide-react';

interface PaymentFailedPageProps {
  orderId?: string | null;
}

export const PaymentFailedPage: React.FC<PaymentFailedPageProps> = ({ orderId: propOrderId }) => {
  const { setActiveTab, language } = useApp();
  const isEn = language === 'en';
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let targetId = propOrderId || null;
    if (!targetId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetId = params.get('orderId') || params.get('id');
      if (!targetId) {
        const parts = window.location.pathname.split('/');
        const idx = parts.indexOf('failed');
        if (idx !== -1 && parts[idx + 1]) {
          targetId = parts[idx + 1];
        }
      }
    }

    if (!targetId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await apiGetOrder(targetId);
        if (res.success && res.order) {
          setOrder(res.order);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [propOrderId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 sm:py-12 px-4">
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xl shadow-rose-500/5 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <XCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isEn ? 'Payment Incomplete' : 'Thanh toán chưa hoàn tất'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isEn ? 'Transaction Unsuccessful' : 'Giao dịch không thành công'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            {order?.rejectionReason
              ? isEn
                ? `Rejection reason: ${order.rejectionReason}`
                : `Lý do từ chối: ${order.rejectionReason}`
              : isEn
              ? 'The payment transaction was canceled or timed out. Your account has not been charged.'
              : 'Giao dịch thanh toán đã bị hủy hoặc thời gian chờ thanh toán đã kết thúc. Tài khoản của bạn chưa bị trừ tiền.'}
          </p>
        </div>

        {order && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-left text-xs space-y-2 max-w-md mx-auto font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">{isEn ? 'Order Code:' : 'Mã đơn hàng:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{order.orderCode || order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isEn ? 'Plan:' : 'Gói cước:'}</span>
              <span className="text-slate-800 dark:text-slate-200">
                {order.packageId === 'premium_yearly'
                  ? isEn
                    ? 'Premium 1 Year'
                    : 'Premium 1 Năm'
                  : isEn
                  ? 'Premium 1 Month'
                  : 'Premium 1 Tháng'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isEn ? 'Amount:' : 'Số tiền:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {order.amount.toLocaleString(isEn ? 'en-US' : 'vi-VN')} {isEn ? 'VND' : 'đ'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (order?.id) {
                window.history.pushState(null, '', `/checkout/${order.id}`);
                setActiveTab('checkout');
              } else {
                setActiveTab('premium');
              }
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isEn ? 'Try Payment Again' : 'Thử thanh toán lại'}</span>
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>{isEn ? 'View Other Plans' : 'Xem các gói khác'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

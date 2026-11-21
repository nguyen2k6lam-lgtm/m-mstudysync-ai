import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetOrder, ClientOrder } from '../../services/api';
import {
  CheckCircle2,
  Clock,
  Crown,
  Receipt,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface PaymentSuccessPageProps {
  orderId?: string | null;
}

export const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ orderId: propOrderId }) => {
  const { currentUser, setActiveTab, language } = useApp();
  const isEn = language === 'en';
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let targetId = propOrderId || null;
    if (!targetId && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetId = params.get('orderId') || params.get('id');
      if (!targetId) {
        const parts = window.location.pathname.split('/');
        const idx = parts.indexOf('success');
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
      } catch (err: any) {
        setError(
          err.message || (isEn ? 'Could not fetch order information.' : 'Không thể lấy thông tin đơn hàng.')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [propOrderId]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 sm:py-12 px-4">
      {loading ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <RotateCcw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isEn ? 'Loading confirmation details...' : 'Đang tải thông tin xác nhận...'}
          </h3>
          <p className="text-xs text-slate-400">
            {isEn ? 'Please wait a moment.' : 'Vui lòng chờ trong giây lát.'}
          </p>
        </div>
      ) : order?.status === 'PAID' ? (
        /* Verified Paid Success */
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-center space-y-6 shadow-xl shadow-emerald-500/10">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? 'Premium Plan Activated' : 'Gói Premium đã được kích hoạt'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isEn ? 'Payment Successful!' : 'Thanh toán thành công!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {isEn ? (
                <>
                  Congratulations! Your account <strong>{currentUser?.email}</strong> has been upgraded to{' '}
                  <strong>Mầm Study Premium</strong> with unlimited access to all VIP features.
                </>
              ) : (
                <>
                  Chúc mừng bạn! Tài khoản <strong>{currentUser?.email}</strong> đã được nâng cấp lên{' '}
                  <strong>Mầm Study Premium</strong> với toàn bộ tính năng VIP không giới hạn.
                </>
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-left text-xs space-y-2.5 max-w-md mx-auto">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isEn ? 'Order Code:' : 'Mã đơn hàng:'}</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {order.orderCode || order.id}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isEn ? 'Subscription Plan:' : 'Gói đăng ký:'}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {order.packageId === 'premium_yearly'
                  ? isEn
                    ? 'Mầm Study Premium (1 Year)'
                    : 'Mầm Study Premium (1 Năm)'
                  : isEn
                  ? 'Mầm Study Premium (1 Month)'
                  : 'Mầm Study Premium (1 Tháng)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isEn ? 'Payment Amount:' : 'Số tiền thanh toán:'}</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                {order.amount.toLocaleString(isEn ? 'en-US' : 'vi-VN')} {isEn ? 'VND' : 'đ'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{isEn ? 'Method:' : 'Phương thức:'}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {order.paymentMethod || (isEn ? 'Bank Transfer' : 'Chuyển khoản ngân hàng')}
              </span>
            </div>
            {order.paidAt && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isEn ? 'Verified At:' : 'Thời gian xác thực:'}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(order.paidAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Start Studying Now' : 'Vào học tập ngay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              <span>{isEn ? 'View Transaction Invoice' : 'Xem hóa đơn giao dịch'}</span>
            </button>
          </div>
        </div>
      ) : order?.status === 'WAITING_VERIFICATION' ? (
        /* Waiting Verification State */
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-center space-y-6 shadow-xl shadow-amber-500/10">
          <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isEn ? 'Awaiting Payment Verification' : 'Đang chờ xác minh thanh toán'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {isEn ? 'Request Pending Review' : 'Yêu cầu đang chờ duyệt'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {isEn ? (
                <>
                  You have submitted a payment confirmation for order{' '}
                  <strong>#{order.orderCode || order.id}</strong>. Our billing team will reconcile the transfer and activate your Premium plan shortly.
                </>
              ) : (
                <>
                  Bạn đã gửi thông báo thanh toán cho đơn hàng{' '}
                  <strong>#{order.orderCode || order.id}</strong>. Ban quản trị sẽ đối soát ngân hàng và kích hoạt gói Premium cho bạn sớm nhất có thể.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('checkout')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all"
            >
              {isEn ? 'Check Order Status' : 'Kiểm tra trạng thái đơn hàng'}
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {isEn ? 'Back to Dashboard' : 'Về Dashboard'}
            </button>
          </div>
        </div>
      ) : (
        /* Generic informational fallback */
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEn ? 'Premium Payment Status' : 'Trạng thái thanh toán Premium'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error ||
              (isEn
                ? 'Could not find a completed order. Please check your order ID or visit your transaction history.'
                : 'Không tìm thấy thông tin đơn hàng thanh toán thành công. Vui lòng kiểm tra lại mã đơn hàng hoặc truy cập lịch sử giao dịch.')}
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setActiveTab('transactions')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors"
            >
              {isEn ? 'View Order History' : 'Xem lịch sử đơn hàng'}
            </button>
            <button
              onClick={() => setActiveTab('premium')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {isEn ? 'View Plans' : 'Xem gói cước'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

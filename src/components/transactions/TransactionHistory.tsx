import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetTransactions } from '../../services/api';
import { Transaction } from '../../types';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Receipt,
  Crown,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const TransactionHistory: React.FC = () => {
  const { currentUser, setActiveTab, showToast } = useApp();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiGetTransactions();
      if (res.success) {
        setTransactions(res.transactions || []);
      }
    } catch (err: any) {
      showToast('Không thể tải lịch sử giao dịch: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentUser]);

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span>Thành công</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Clock className="w-3 h-3" />
            <span>Chờ thanh toán</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="w-3 h-3" />
            <span>Thất bại</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>Đã hủy</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <span>Hết hạn</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'momo':
        return 'Ví MoMo';
      case 'zalopay':
        return 'Ví ZaloPay';
      case 'stripe':
        return 'Stripe';
      default:
        return 'Cổng thanh toán';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Lịch sử giao dịch & Hóa đơn
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Theo dõi tất cả đơn hàng, trạng thái thanh toán và hóa đơn của tài khoản bạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => setActiveTab('checkout')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Nâng cấp gói</span>
          </button>
        </div>
      </div>

      {/* Transactions Table or Empty State */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
            <p className="text-xs">Đang tải lịch sử giao dịch...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Bạn chưa có giao dịch nào.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi bạn đăng ký hoặc nâng cấp gói StudySync AI Premium bằng MoMo hoặc ZaloPay, các đơn hàng sẽ xuất hiện tại đây.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('checkout')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <span>Nâng cấp Premium ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold">
                  <th className="py-3.5 px-4">Mã đơn hàng</th>
                  <th className="py-3.5 px-4">Cổng thanh toán</th>
                  <th className="py-3.5 px-4">Gói dịch vụ</th>
                  <th className="py-3.5 px-4">Số tiền</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {tx.orderId || tx.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {getProviderLabel(tx.provider)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {tx.plan === 'premium_yearly' ? 'Premium 1 Năm' : 'Premium 1 Tháng'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {tx.amount.toLocaleString('vi-VN')} {tx.currency.toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-semibold inline-flex items-center gap-1"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chi tiết giao dịch
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedTx.orderId || selectedTx.id}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Cổng thanh toán:</span>
                <strong className="text-slate-900 dark:text-white">
                  {getProviderLabel(selectedTx.provider)}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Gói nâng cấp:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedTx.plan === 'premium_yearly' ? 'StudySync AI Premium (1 Năm)' : 'StudySync AI Premium (1 Tháng)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Số tiền:</span>
                <strong className="text-base text-indigo-600 dark:text-indigo-400">
                  {selectedTx.amount.toLocaleString('vi-VN')} {selectedTx.currency.toUpperCase()}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Trạng thái:</span>
                <div>{getStatusBadge(selectedTx.status)}</div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Phương thức:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {selectedTx.paymentMethod || 'Ví điện tử'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Thời gian tạo:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(selectedTx.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              {selectedTx.paidAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Thời gian thanh toán:</span>
                  <span className="text-emerald-600 font-semibold">
                    {new Date(selectedTx.paidAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              )}
              {selectedTx.failureReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs">
                  <strong>Lý do thất bại:</strong> {selectedTx.failureReason}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiGetUserOrders, apiGetTransactions, ClientOrder } from '../../services/api';
import { Modal } from '../common/Modal';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Receipt,
  ArrowRight,
  Filter,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Crown,
  FileImage,
  ArrowUpRight,
} from 'lucide-react';

interface UnifiedPaymentRecord {
  id: string; // Order ID or Transaction ID
  orderCode: string;
  planName: string;
  amount: number;
  currency: string;
  provider: string;
  paymentMethod: string;
  status: 'PENDING' | 'WAITING_VERIFICATION' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  paidAt?: string;
  receiptUrl?: string;
  rejectionReason?: string;
  isOrder: boolean;
}

export const TransactionHistoryPage: React.FC = () => {
  const { currentUser, setActiveTab, language } = useApp();
  const isEn = language === 'en';

  const [records, setRecords] = useState<UnifiedPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'WAITING_VERIFICATION' | 'PAID' | 'REJECTED'>('all');
  const [selectedRecord, setSelectedRecord] = useState<UnifiedPaymentRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, txRes] = await Promise.allSettled([
        apiGetUserOrders(),
        apiGetTransactions(),
      ]);

      const unified: UnifiedPaymentRecord[] = [];
      const seenIds = new Set<string>();

      // 1. Process Bank/System Orders (Requirement 6)
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.orders) {
        for (const ord of ordersRes.value.orders) {
          seenIds.add(ord.id);
          if (ord.orderCode) seenIds.add(ord.orderCode);

          let normalizedStatus: UnifiedPaymentRecord['status'] = 'PENDING';
          if (ord.status === 'PAID') normalizedStatus = 'PAID';
          else if (ord.status === 'WAITING_VERIFICATION') normalizedStatus = 'WAITING_VERIFICATION';
          else if (ord.status === 'REJECTED' || ord.status === 'FAILED') normalizedStatus = 'REJECTED';
          else if (ord.status === 'CANCELLED') normalizedStatus = 'CANCELLED';
          else if (ord.status === 'EXPIRED') normalizedStatus = 'EXPIRED';

          unified.push({
            id: ord.id,
            orderCode: ord.orderCode || ord.id.slice(-6).toUpperCase(),
            planName:
              ord.packageId === 'premium_yearly'
                ? isEn
                  ? 'StudySync AI Premium (1 Year)'
                  : 'StudySync AI Premium (1 Năm)'
                : isEn
                ? 'StudySync AI Premium (1 Month)'
                : 'StudySync AI Premium (1 Tháng)',
            amount: ord.amount,
            currency: ord.currency || 'vnd',
            provider: ord.provider || 'bank',
            paymentMethod: ord.paymentMethod || (isEn ? 'TPBank Transfer' : 'Chuyển khoản TPBank'),
            status: normalizedStatus,
            createdAt: ord.createdAt,
            paidAt: ord.paidAt,
            receiptUrl: ord.receiptUrl,
            rejectionReason: ord.rejectionReason,
            isOrder: true,
          });
        }
      }

      // 2. Process Gateway Transactions (MoMo, ZaloPay, Stripe)
      if (txRes.status === 'fulfilled' && txRes.value?.transactions) {
        for (const tx of txRes.value.transactions) {
          const matchKey = tx.orderId || tx.id;
          if (seenIds.has(matchKey) || seenIds.has(tx.id)) {
            continue; // already listed via orders
          }

          let normalizedStatus: UnifiedPaymentRecord['status'] = 'PENDING';
          if (tx.status === 'paid') normalizedStatus = 'PAID';
          else if (tx.status === 'pending') normalizedStatus = 'PENDING';
          else if (tx.status === 'failed') normalizedStatus = 'REJECTED';
          else if (tx.status === 'cancelled') normalizedStatus = 'CANCELLED';

          unified.push({
            id: tx.orderId || tx.id,
            orderCode: tx.orderId || tx.id.slice(-8).toUpperCase(),
            planName:
              tx.plan === 'premium_yearly'
                ? isEn
                  ? 'StudySync AI Premium (1 Year)'
                  : 'StudySync AI Premium (1 Năm)'
                : isEn
                ? 'StudySync AI Premium (1 Month)'
                : 'StudySync AI Premium (1 Tháng)',
            amount: tx.amount,
            currency: tx.currency || 'vnd',
            provider: tx.provider,
            paymentMethod: tx.paymentMethod || tx.provider?.toUpperCase(),
            status: normalizedStatus,
            createdAt: tx.createdAt,
            paidAt: tx.paidAt,
            rejectionReason: tx.failureReason,
            isOrder: true,
          });
        }
      }

      // Sort newest first
      unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecords(unified);
    } catch (err: any) {
      setError(
        err.message || (isEn ? 'Could not load transaction history.' : 'Không thể tải lịch sử giao dịch.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [language]);

  const filteredRecords = records.filter((rec) => {
    if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = rec.orderCode?.toLowerCase().includes(q) || rec.id.toLowerCase().includes(q);
      const matchPlan = rec.planName?.toLowerCase().includes(q);
      const matchProvider = rec.provider?.toLowerCase().includes(q);
      return matchOrder || matchPlan || matchProvider;
    }
    return true;
  });

  const formatCurrency = (amount: number, currency: string = 'vnd') => {
    if (currency.toLowerCase() === 'usd') {
      return `$${(amount / 100).toFixed(2)}`;
    }
    return new Intl.NumberFormat(isEn ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status: UnifiedPaymentRecord['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PAID</span>
          </span>
        );
      case 'WAITING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>WAITING_VERIFICATION</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>REJECTED</span>
          </span>
        );
      case 'CANCELLED':
      case 'EXPIRED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getProviderBadge = (provider: string, method?: string) => {
    switch (provider) {
      case 'bank':
        return (
          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {isEn ? 'TPBank Transfer' : 'TPBank (CK)'}
          </span>
        );
      case 'momo':
        return (
          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            {isEn ? 'MoMo Wallet' : 'Ví MoMo'}
          </span>
        );
      case 'zalopay':
        return (
          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {isEn ? 'ZaloPay Wallet' : 'Ví ZaloPay'}
          </span>
        );
      case 'stripe':
        return (
          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {isEn ? 'International Card' : 'Thẻ Quốc tế'}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {method || (isEn ? 'Bank Transfer' : 'Chuyển khoản')}
          </span>
        );
    }
  };

  const navigateToCheckout = (orderId: string) => {
    window.history.pushState(null, '', `/checkout/${orderId}`);
    setActiveTab('checkout');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isEn ? 'Transaction & Order History' : 'Lịch sử giao dịch & Đơn hàng'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? `Track all StudySync AI subscription orders for ${currentUser?.email}.`
              : `Theo dõi tất cả đơn hàng đăng ký gói StudySync AI của tài khoản ${currentUser?.email}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={isEn ? 'Refresh list' : 'Làm mới danh sách'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{isEn ? 'Upgrade to Premium' : 'Nâng cấp gói Premium'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isEn ? 'Search by order code, plan name...' : 'Tìm theo mã đơn hàng, tên gói...'
            }
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isEn ? `All (${records.length})` : `Tất cả (${records.length})`}
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            PAID ({records.filter((t) => t.status === 'PAID').length})
          </button>
          <button
            onClick={() => setStatusFilter('WAITING_VERIFICATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'WAITING_VERIFICATION'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            WAITING_VERIFICATION ({records.filter((t) => t.status === 'WAITING_VERIFICATION').length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            PENDING ({records.filter((t) => t.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            REJECTED ({records.filter((t) => t.status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* Orders & Transactions Table / List (Requirement 6) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500 mb-3" />
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Loading orders & transactions...'
                : 'Đang tải danh sách đơn hàng & giao dịch...'}
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              {isEn ? 'No orders yet' : 'Chưa có đơn hàng nào'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isEn
                ? 'When you create a TPBank transfer or payment gateway order, it will appear here.'
                : 'Khi bạn tạo đơn hàng chuyển khoản TPBank hoặc cổng thanh toán, đơn hàng sẽ được hiển thị đầy đủ tại đây.'}
            </p>
            <button
              onClick={() => setActiveTab('premium')}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
            >
              {isEn ? 'View Subscription Plans' : 'Xem các gói dịch vụ'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{isEn ? 'Order Code' : 'Mã đơn hàng'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Plan Name' : 'Tên gói cước'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Method' : 'Phương thức'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Amount' : 'Số tiền'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Status' : 'Trạng thái'}</th>
                  <th className="py-3.5 px-4">{isEn ? 'Created At' : 'Ngày tạo'}</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">
                    {isEn ? 'Actions' : 'Thao tác'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Order Code */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          #{rec.orderCode}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                          {rec.id}
                        </span>
                      </div>
                    </td>

                    {/* Package Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {rec.planName}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4">{getProviderBadge(rec.provider, rec.paymentMethod)}</td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(rec.amount, rec.currency)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(rec.status)}</td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(rec.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Action buttons (Requirement 6) */}
                    <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* If order is incomplete (PENDING or WAITING_VERIFICATION), show button to /checkout/:orderId */}
                        {(rec.status === 'PENDING' || rec.status === 'WAITING_VERIFICATION') && (
                          <button
                            onClick={() => navigateToCheckout(rec.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title={isEn ? 'Go to checkout page' : 'Chuyển đến trang thanh toán'}
                          >
                            <span>{isEn ? 'Pay Now' : 'Thanh toán'}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                          title={isEn ? 'View invoice details' : 'Xem hóa đơn chi tiết'}
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Receipt Modal */}
      {selectedRecord && (
        <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} maxWidth="md">
          <div className="pt-2">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEn ? 'Order & Invoice Details' : 'Chi tiết đơn hàng & Hóa đơn'}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {isEn ? 'Order Code: ' : 'Mã đơn: '}#{selectedRecord.orderCode} ({selectedRecord.id})
              </p>
            </div>

            <div className="py-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isEn ? 'Status:' : 'Trạng thái:'}</span>
                <div>{getStatusBadge(selectedRecord.status)}</div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isEn ? 'Plan:' : 'Gói cước:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedRecord.planName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isEn ? 'Amount:' : 'Số tiền:'}</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                  {formatCurrency(selectedRecord.amount, selectedRecord.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isEn ? 'Method:' : 'Phương thức:'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedRecord.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{isEn ? 'Created At:' : 'Thời gian tạo:'}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(selectedRecord.createdAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                </span>
              </div>
              {selectedRecord.paidAt && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{isEn ? 'Verified At:' : 'Thời gian xác thực:'}</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {new Date(selectedRecord.paidAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                  </span>
                </div>
              )}
              {selectedRecord.receiptUrl && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isEn ? 'Attached Receipt:' : 'Biên lai đính kèm:'}
                  </span>
                  <img
                    src={selectedRecord.receiptUrl}
                    alt={isEn ? 'Receipt' : 'Biên lai'}
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                  <a
                    href={selectedRecord.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <span>{isEn ? 'View original image' : 'Xem ảnh gốc'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {selectedRecord.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                  <span className="font-bold">
                    {isEn ? 'Rejection reason:' : 'Lý do từ chối:'}
                  </span>{' '}
                  {selectedRecord.rejectionReason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {(selectedRecord.status === 'PENDING' || selectedRecord.status === 'WAITING_VERIFICATION') ? (
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    navigateToCheckout(selectedRecord.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isEn ? 'Go to Checkout Page' : 'Chuyển đến trang thanh toán'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                {isEn ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

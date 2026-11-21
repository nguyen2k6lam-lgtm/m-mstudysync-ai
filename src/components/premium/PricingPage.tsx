import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isPremium } from '../../utils/planLimits';
import { safeConfirm } from '../../utils/formatters';
import {
  apiCreateMoMoPayment,
  apiCreateZaloPayPayment,
  apiCreateOrder,
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  SubscriptionInfo,
} from '../../services/api';
import { PaymentModal } from '../billing/PaymentModal';
import {
  Crown,
  CheckCircle2,
  XCircle,
  Zap,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  Check,
  Info,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Receipt,
  QrCode,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const {
    currentUser,
    upgradeToPremium,
    downgradeToFree,
    showToast,
    setActiveTab,
    openAuthModal,
    language,
  } = useApp();
  const isEn = language === 'en';

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingProvider, setLoadingProvider] = useState<'momo' | 'zalopay' | 'stripe' | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [subDetails, setSubDetails] = useState<SubscriptionInfo | null>(null);

  // Active Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeOrderData, setActiveOrderData] = useState<{
    provider: 'momo' | 'zalopay';
    orderId: string;
    transactionId: string;
    amount: number;
    plan: string;
    payUrl: string;
    qrCodeUrl?: string;
    mode: string;
  } | null>(null);

  const premium = isPremium(currentUser);

  // Fetch subscription details from server
  const loadSubscriptionInfo = async () => {
    if (!currentUser) return;
    try {
      const data = await getSubscription(currentUser.id);
      setSubDetails(data);
    } catch (e) {
      console.warn('Could not fetch subscription details from server:', e);
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, [currentUser]);

  const [creatingOrder, setCreatingOrder] = useState(false);

  const handleBuyNow = async (preferredProvider: 'bank' | 'momo' | 'zalopay' = 'bank') => {
    if (!currentUser) {
      openAuthModal('login');
      showToast(
        isEn ? 'Please sign in before purchasing a Premium plan.' : 'Vui lòng đăng nhập trước khi mua gói Premium.',
        'warning'
      );
      return;
    }
    if (creatingOrder) return;
    setCreatingOrder(true);
    try {
      showToast(
        isEn ? 'Creating your order...' : 'Đang tạo đơn hàng trong hệ thống...',
        'info'
      );
      const packageId = billingCycle === 'yearly' ? 'premium_yearly' : 'premium_monthly';
      const res = await apiCreateOrder({ packageId, provider: preferredProvider });
      if (res.success && res.order) {
        showToast(
          isEn ? 'Order created successfully!' : 'Đã tạo đơn hàng thành công!',
          'success'
        );
        window.history.pushState(null, '', `/checkout/${res.order.id}`);
        setActiveTab('checkout');
      }
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Failed to create order.' : 'Không thể tạo đơn hàng.'), 'error');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleStartPayment = async (provider: 'momo' | 'zalopay') => {
    if (!currentUser) {
      openAuthModal('login');
      showToast(
        isEn ? 'Please sign in before proceeding to payment.' : 'Vui lòng đăng nhập trước khi tiến hành thanh toán.',
        'warning'
      );
      return;
    }

    setLoadingProvider(provider);
    try {
      const plan = billingCycle === 'yearly' ? 'premium_yearly' : 'premium_monthly';
      let res;
      if (provider === 'momo') {
        res = await apiCreateMoMoPayment({ plan, billingCycle });
      } else {
        res = await apiCreateZaloPayPayment({ plan, billingCycle });
      }

      setActiveOrderData({
        provider,
        orderId: res.orderId,
        transactionId: res.transactionId,
        amount: res.amount,
        plan: res.plan,
        payUrl: res.payUrl,
        qrCodeUrl: res.qrCodeUrl,
        mode: res.mode,
      });
      setPaymentModalOpen(true);
    } catch (err: any) {
      showToast(
        err.message ||
          (isEn
            ? `Failed to create ${provider.toUpperCase()} transaction`
            : `Không thể tạo giao dịch ${provider.toUpperCase()}`),
        'error'
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleCancelSub = async () => {
    if (
      !safeConfirm(
        isEn
          ? 'Are you sure you want to cancel your Premium auto-renewal? You will keep full VIP benefits until the end of your current billing period.'
          : 'Bạn có chắc chắn muốn hủy gia hạn gói Premium? Bạn vẫn được sử dụng toàn bộ quyền lợi VIP đến hết chu kỳ thanh toán hiện tại.'
      )
    ) {
      return;
    }

    setCancelLoading(true);
    try {
      const res = await cancelSubscription(currentUser?.id || 'usr_demo');
      await loadSubscriptionInfo();
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast((isEn ? 'Error canceling subscription: ' : 'Lỗi khi hủy gói: ') + err.message, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Simulation Banner Notice */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">
            {isEn
              ? 'Official MoMo & ZaloPay E-Wallet Integration: '
              : 'Tích hợp Ví điện tử MoMo & ZaloPay chính thức: '}
          </strong>
          {isEn
            ? 'Our system connects directly with MoMo and ZaloPay payment gateways. Each transaction generates a unique order ID, secure QR code, and automatically activates Premium upon server webhook verification.'
            : 'Hệ thống kết nối trực tiếp cổng thanh toán MoMo và ZaloPay. Mỗi giao dịch tạo mã đơn hàng duy nhất, sinh mã QR code bảo mật và tự động kích hoạt gói Premium ngay sau khi nhận được Webhook xác nhận từ máy chủ.'}
        </div>
      </div>

      {/* Subscription Active Info Panel */}
      {subDetails && premium && (
        <div className="p-6 rounded-3xl bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/30 dark:border-amber-500/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? 'StudySync Premium Plan Active' : 'Gói StudySync Premium đang hoạt động'}
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${subDetails.status === 'canceled' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                {subDetails.status === 'canceled'
                  ? isEn
                    ? 'Canceled (Still Valid)'
                    : 'Đã hủy gia hạn (Vẫn còn hạn dùng)'
                  : isEn
                  ? 'Active'
                  : 'Đang hoạt động'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {subDetails.status === 'canceled' ? (
                <span>
                  {isEn ? (
                    <>
                      You have canceled auto-renewal, but{' '}
                      <strong>
                        you still have full access to all VIP features until{' '}
                        {new Date(subDetails.endDate).toLocaleDateString('en-US')}
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      Bạn đã hủy gia hạn tự động nhưng{' '}
                      <strong>
                        vẫn được sử dụng toàn bộ tính năng VIP đến hết ngày{' '}
                        {new Date(subDetails.endDate).toLocaleDateString('vi-VN')}
                      </strong>
                      .
                    </>
                  )}
                </span>
              ) : (
                <span>
                  {isEn ? 'Next billing date: ' : 'Chu kỳ tiếp theo gia hạn vào: '}
                  <strong>
                    {new Date(subDetails.endDate).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                  </strong>
                  .
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('transactions')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{isEn ? 'Billing History' : 'Xem lịch sử hóa đơn'}</span>
            </button>
            {subDetails.status !== 'canceled' && (
              <button
                onClick={handleCancelSub}
                disabled={cancelLoading}
                className="px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                {cancelLoading
                  ? isEn
                    ? 'Processing...'
                    : 'Đang xử lý...'
                  : isEn
                  ? 'Cancel Auto-Renewal'
                  : 'Hủy gia hạn'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-linear-to-r from-amber-500/15 to-indigo-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold mb-4">
          <Crown className="w-4 h-4 text-amber-500" />
          <span>{isEn ? 'StudySync AI Upgrade Plans' : 'Gói nâng cấp StudySync AI'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          {isEn
            ? 'A Small Investment for A+ Grades All Semester'
            : 'Đầu tư nhỏ cho điểm số A+ cả kỳ học'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isEn ? (
            <>
              Starting from just <strong>58,000 VND/month</strong> (billed yearly) — less than two cups of coffee to save hundreds of hours of note-taking and exam prep.
            </>
          ) : (
            <>
              Chỉ từ <strong>58.000 đ/tháng</strong> (khi thanh toán năm) — ít hơn chi phí 2 cốc cà phê nhưng tiết kiệm cho bạn hàng trăm giờ ghi chép và ôn thi.
            </>
          )}
        </p>

        {/* Toggle Billing Cycle */}
        <div className="mt-6 inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'Monthly (79k/mo)' : 'Theo Tháng (79k/tháng)'}
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{isEn ? 'Yearly' : 'Theo Năm'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
              {isEn ? 'Save 25% (699k/yr)' : 'Tiết kiệm 25% (699k/năm)'}
            </span>
          </button>
        </div>
      </div>

      {/* Cards Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* FREE CARD */}
        <div
          className={`p-8 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
            !premium
              ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-lg'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {isEn ? 'Free Student Plan' : 'Gói Sinh Viên Miễn Phí'}
              </span>
              {!premium && (
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {isEn ? '● Your current plan' : '● Gói hiện tại của bạn'}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">
                {isEn ? '0 VND' : '0 đ'}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {isEn ? '/ forever' : '/ vĩnh viễn'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              {isEn
                ? 'Essential smart study tools supporting up to 4 core subjects.'
                : 'Học tập thông minh cơ bản, hỗ trợ tối đa 4 môn học trọng tâm.'}
            </p>

            <div className="space-y-3.5 mb-8 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>
                    {isEn ? 'Manage up to 4 subjects' : 'Quản lý tối đa 4 môn học'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {isEn
                    ? '300 minutes of lecture recording / month'
                    : '300 phút ghi âm bài giảng / tháng'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {isEn ? '20 AI summary requests per day' : '20 lượt gọi AI tóm tắt mỗi ngày'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {isEn ? 'Basic Flashcards & Quizzes' : 'Flashcard & Trắc nghiệm cơ bản'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                <span>
                  {isEn ? 'Cannot manage more than 4 subjects' : 'Không thể quản lý trên 4 môn'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400">
                <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                <span>
                  {isEn
                    ? 'No high-resolution expanded mind maps'
                    : 'Không có sơ đồ tư duy mở rộng chất lượng cao'}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-center text-xs font-bold">
            {!premium
              ? isEn
                ? 'Currently using this plan'
                : 'Đang sử dụng gói này'
              : isEn
              ? 'Default Plan'
              : 'Gói mặc định'}
          </div>
        </div>

        {/* PREMIUM CARD */}
        <div
          className={`relative p-8 rounded-3xl bg-linear-to-b from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-slate-900 border-2 transition-all flex flex-col justify-between ${
            premium
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xl'
              : 'border-indigo-600 shadow-xl'
          }`}
        >
          <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-linear-to-r from-amber-500 to-indigo-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isEn ? 'STUDENT VIP' : 'VIP SINH VIÊN'}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                StudySync AI Premium
              </span>
              {premium && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  {isEn ? 'Active' : 'Đang hoạt động'}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {billingCycle === 'monthly'
                  ? isEn
                    ? '79,000 VND'
                    : '79.000 đ'
                  : isEn
                  ? '699,000 VND'
                  : '699.000 đ'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                {billingCycle === 'monthly'
                  ? isEn
                    ? '/ month'
                    : '/ tháng'
                  : isEn
                  ? '/ year (~58k/mo)'
                  : '/ năm (~58k/tháng)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              {isEn
                ? 'Unlock all limits: Unlimited subjects and 10x lecture recording capacity.'
                : 'Mở khóa mọi giới hạn: Không giới hạn môn học, tăng gấp 10 lần thời lượng ghi âm.'}
            </p>

            <div className="space-y-3.5 mb-8 text-xs text-slate-900 dark:text-white font-medium">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>{isEn ? 'Unlimited subjects' : 'Không giới hạn số môn học'}</strong>{' '}
                  {isEn ? '(more than 4)' : '(trên 4 môn)'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>
                    {isEn ? '3,000 recording minutes' : '3.000 phút ghi âm'}
                  </strong>{' '}
                  {isEn ? 'per month' : 'bài giảng mỗi tháng'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  <strong>
                    {isEn ? '500 AI requests per day' : '500 yêu cầu AI mỗi ngày'}
                  </strong>{' '}
                  {isEn ? 'with zero latency' : 'không độ trễ'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  {isEn ? 'Unlimited AI Tutor questions' : 'Trợ giảng AI không giới hạn câu hỏi'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  {isEn
                    ? 'Expanded Mind Maps & High-Res Export'
                    : 'Sơ đồ tư duy mở rộng & Xuất file chất lượng cao'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>
                  {isEn
                    ? 'High-accuracy automatic assignment deadline detection'
                    : 'Nhận diện deadline bài tập tự động với độ chính xác cao'}
                </span>
              </div>
            </div>
          </div>

          {/* Primary "Mua ngay" Action (Requirement 2 & 3) */}
          <div className="space-y-3">
            <button
              onClick={() => handleBuyNow('bank')}
              disabled={creatingOrder || loadingProvider !== null}
              className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {creatingOrder ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Creating order...' : 'Đang tạo đơn hàng...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>
                    {isEn
                      ? `Buy Now (${billingCycle === 'monthly' ? '79,000 VND' : '699,000 VND'})`
                      : `Mua ngay (${billingCycle === 'monthly' ? '79.000 đ' : '699.000 đ'})`}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isEn ? 'or fast checkout via' : 'hoặc thanh toán nhanh'}
              </span>
              <div className="grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* MoMo Button */}
              <button
                onClick={() => handleBuyNow('momo')}
                disabled={creatingOrder || loadingProvider !== null}
                className="py-2.5 px-3 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/80 hover:bg-pink-100 text-pink-700 dark:text-pink-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <div className="w-4 h-4 rounded-md bg-pink-600 text-white flex items-center justify-center text-[8px] font-black">
                  Mo
                </div>
                <span>{isEn ? 'MoMo Wallet' : 'Ví MoMo'}</span>
              </button>

              {/* ZaloPay Button */}
              <button
                onClick={() => handleBuyNow('zalopay')}
                disabled={creatingOrder || loadingProvider !== null}
                className="py-2.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <div className="w-4 h-4 rounded-md bg-blue-600 text-white flex items-center justify-center text-[8px] font-black">
                  ZLP
                </div>
                <span>{isEn ? 'ZaloPay Wallet' : 'Ví ZaloPay'}</span>
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-400 mt-1">
              {isEn
                ? '* Secure order generation • Instant account activation after payment'
                : '* Sinh mã đơn hàng bảo mật • Kích hoạt tài khoản ngay sau khi thanh toán'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-center">
          {isEn ? 'Detailed Plan Feature Comparison' : 'So sánh chi tiết tính năng gói dịch vụ'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-bold">{isEn ? 'Feature' : 'Tính năng'}</th>
                <th className="py-3 px-4 font-bold text-center">
                  {isEn ? 'Free Plan' : 'Gói Free'}
                </th>
                <th className="py-3 px-4 font-bold text-center text-indigo-600 dark:text-indigo-400">
                  {isEn ? 'Premium VIP Plan' : 'Gói Premium VIP'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Maximum subjects' : 'Số môn học tối đa'}
                </td>
                <td className="py-3 px-4 text-center text-slate-500 font-bold">
                  {isEn ? '4 subjects' : '4 môn'}
                </td>
                <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-black">
                  {isEn ? 'Unlimited' : 'Không giới hạn (Vô hạn)'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Monthly recording duration' : 'Thời lượng ghi âm mỗi tháng'}
                </td>
                <td className="py-3 px-4 text-center text-slate-500">
                  {isEn ? '300 mins' : '300 phút'}
                </td>
                <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {isEn ? '3,000 mins' : '3.000 phút'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Daily AI requests' : 'Lượt yêu cầu AI mỗi ngày'}
                </td>
                <td className="py-3 px-4 text-center text-slate-500">
                  {isEn ? '20 / day' : '20 lần/ngày'}
                </td>
                <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {isEn ? '500 / day' : '500 lần/ngày'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn
                    ? 'Auto-generated Flashcards & Quizzes'
                    : 'Tự động tạo Flashcard & Trắc nghiệm'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-500 font-bold">
                  {isEn ? '✓ Basic' : '✓ Cơ bản'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                  {isEn ? '✓ Advanced' : '✓ Nâng cao'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? 'Smart AI Deadline Detection' : 'Nhận diện Deadline thông minh bằng AI'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-500 font-bold">
                  {isEn ? '✓ Yes' : '✓ Có'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                  {isEn ? '✓ High-priority auto' : '✓ Tự động ưu tiên cao'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                  {isEn ? '24/7 AI Tutor Q&A' : 'Hỏi đáp Trợ giảng AI 24/7'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-500 font-bold">
                  {isEn ? '✓ Yes' : '✓ Có'}
                </td>
                <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                  {isEn ? '✓ Unlimited' : '✓ Không giới hạn'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal for MoMo & ZaloPay */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        orderData={activeOrderData}
        onSuccess={() => {
          loadSubscriptionInfo();
          upgradeToPremium();
        }}
      />
    </div>
  );
};

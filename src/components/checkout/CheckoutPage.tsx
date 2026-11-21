import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  apiGetOrder,
  apiGetBankConfig,
  apiConfirmOrderPayment,
  apiUploadOrderReceipt,
  apiAdminApproveOrder,
  apiAdminRejectOrder,
  BankConfig,
  ClientOrder,
} from '../../services/api';
import {
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Building2,
  CreditCard,
  UploadCloud,
  FileImage,
  ExternalLink,
  Info,
  UserCheck,
} from 'lucide-react';

interface CheckoutPageProps {
  orderId?: string | null;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ orderId: propOrderId }) => {
  const { currentUser, setActiveTab, showToast, refreshUserData, openAuthModal, language } = useApp();
  const isEn = language === 'en';

  // Primary data states
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [orderId, setOrderId] = useState<string | null>(propOrderId || null);
  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: 'TPBank',
    accountNumber: '00000493116',
    accountName: 'DINH THI HUYEN ANH',
    qrImageUrl: '/images/tpbank_qr.png',
    momoQrUrl: '/images/momo_qr.png',
    zalopayQrUrl: '/images/zalopay_qr.png',
    instructions: 'Vui lòng ghi đúng mã đơn hàng trong nội dung chuyển khoản.',
  });

  // UI state: 'loading' | 'unauthorized' | 'not_found' | 'ready' | 'error'
  const [uiState, setUiState] = useState<'loading' | 'unauthorized' | 'not_found' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Selected payment tab inside checkout: 'bank' | 'momo' | 'zalopay'
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'momo' | 'zalopay'>('bank');

  // Copy feedbacks
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Action states
  const [isConfirming, setIsConfirming] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isAdminProcessing, setIsAdminProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Expiry countdown
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60);

  // 1. Fetch public Bank Configuration
  useEffect(() => {
    apiGetBankConfig()
      .then((cfg) => {
        if (cfg) setBankConfig(cfg);
      })
      .catch(() => {});
  }, []);

  // 2. Resolve target orderId from props or URL
  useEffect(() => {
    let targetId = propOrderId || null;
    if (!targetId && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const qOid = searchParams.get('orderId') || searchParams.get('id');
      if (qOid) {
        targetId = qOid;
      } else {
        const parts = window.location.pathname.split('/');
        const chkIdx = parts.indexOf('checkout');
        if (chkIdx !== -1 && parts[chkIdx + 1]) {
          targetId = parts[chkIdx + 1];
        }
      }
    }

    if (targetId) {
      setOrderId(targetId);
      loadOrderDetails(targetId);
    } else {
      // If no orderId in URL, show friendly not-found / select package
      setUiState('not_found');
      setErrorMessage(
        isEn
          ? 'Order information not found. Please select a plan to continue.'
          : 'Không tìm thấy thông tin đơn hàng. Vui lòng chọn gói cước để tiếp tục.'
      );
    }
  }, [propOrderId]);

  // Load Order Details with robust error handling
  const loadOrderDetails = async (oid: string) => {
    setUiState('loading');
    setErrorMessage('');
    try {
      const res = await apiGetOrder(oid);
      if (res && res.success && res.order) {
        const o = res.order;
        setOrder(o);
        setUiState('ready');

        if (o.receiptUrl) {
          setReceiptPreview(o.receiptUrl);
        }

        if (o.provider === 'momo') {
          setSelectedMethod('momo');
        } else if (o.provider === 'zalopay') {
          setSelectedMethod('zalopay');
        } else {
          setSelectedMethod('bank');
        }

        // Calculate time left if still pending
        if (o.expiredAt && o.status === 'PENDING') {
          const diffSeconds = Math.max(0, Math.floor((new Date(o.expiredAt).getTime() - Date.now()) / 1000));
          setTimeLeft(diffSeconds);
        }
      } else {
        setUiState('not_found');
        setErrorMessage(
          isEn ? 'Order not found in the system.' : 'Không tìm thấy đơn hàng trong hệ thống.'
        );
      }
    } catch (err: any) {
      if (err.message?.includes('đăng nhập') || !currentUser) {
        setUiState('unauthorized');
        setErrorMessage(
          isEn
            ? 'Please sign in to view your payment order details.'
            : 'Vui lòng đăng nhập để xem thông tin đơn hàng thanh toán.'
        );
      } else {
        setUiState('not_found');
        setErrorMessage(
          err.message || (isEn ? 'Could not load order details.' : 'Không thể tải thông tin đơn hàng.')
        );
      }
    }
  };

  // Poll order status when in WAITING_VERIFICATION or PENDING so UI auto-updates if admin approves
  useEffect(() => {
    let timer: any = null;
    if (order && (order.status === 'WAITING_VERIFICATION' || order.status === 'PENDING')) {
      timer = setInterval(async () => {
        try {
          const res = await apiGetOrder(order.id);
          if (res.success && res.order) {
            if (res.order.status !== order.status) {
              setOrder(res.order);
              if (res.order.status === 'PAID') {
                showToast(
                  isEn
                    ? '🎉 Order verified! Your Premium plan is now active.'
                    : '🎉 Đơn hàng đã được xác minh thành công! Gói Premium đã kích hoạt.',
                  'success'
                );
                if (refreshUserData) {
                  await refreshUserData();
                }
              } else if (res.order.status === 'REJECTED') {
                showToast(
                  isEn
                    ? `Order rejected: ${res.order.rejectionReason || 'Please check your transfer details.'}`
                    : `Đơn hàng bị từ chối: ${res.order.rejectionReason || 'Vui lòng kiểm tra lại.'}`,
                  'error'
                );
              }
            }
          }
        } catch {
          // ignore transient poll error
        }
      }, 4000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [order?.id, order?.status, refreshUserData, showToast]);

  // Countdown timer for pending order
  useEffect(() => {
    let tick: any = null;
    if (order && order.status === 'PENDING' && timeLeft > 0) {
      tick = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => {
      if (tick) clearInterval(tick);
    };
  }, [order?.status, timeLeft]);

  // Clipboard copy helper
  const handleCopy = (text: string, fieldName: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(isEn ? `Copied ${label}!` : `Đã sao chép ${label}!`, 'info');
    setTimeout(() => {
      setCopiedField((cur) => (cur === fieldName ? null : cur));
    }, 2500);
  };

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate transfer content strictly adhering to requirement 2: STUDYSYNC {orderCode} {userId}
  const transferContent = order
    ? `STUDYSYNC ${order.orderCode || order.id.slice(-6).toUpperCase()} ${currentUser?.id || order.userId}`
    : 'STUDYSYNC';

  // Handle "Tôi đã thanh toán" button click (Requirement 4)
  const handleCustomerConfirmPayment = async () => {
    if (!order) return;
    setIsConfirming(true);
    try {
      const res = await apiConfirmOrderPayment(order.id);
      if (res.success && res.order) {
        setOrder(res.order);
        showToast(
          isEn
            ? 'Your payment confirmation has been submitted for verification.'
            : 'Yêu cầu thanh toán của bạn đang chờ xác minh.',
          'info'
        );
      }
    } catch (err: any) {
      showToast(
        err.message || (isEn ? 'Failed to submit confirmation request.' : 'Không thể gửi yêu cầu xác nhận.'),
        'error'
      );
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle Receipt Upload (Requirement 4)
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showToast(
        isEn
          ? 'Only image files are accepted: JPG, PNG, WEBP.'
          : 'Chỉ chấp nhận file hình ảnh: JPG, PNG, WEBP.',
        'error'
      );
      return;
    }

    // Validate size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast(
        isEn ? 'Image size must not exceed 10MB.' : 'Dung lượng ảnh không được vượt quá 10MB.',
        'error'
      );
      return;
    }

    setReceiptFile(file);
    setIsUploadingReceipt(true);

    try {
      const res = await apiUploadOrderReceipt(order.id, file);
      if (res.success) {
        setReceiptPreview(res.receiptUrl);
        setOrder(res.order);
        showToast(
          isEn ? 'Receipt uploaded successfully!' : 'Đã tải lên ảnh biên lai thành công!',
          'success'
        );
      }
    } catch (err: any) {
      showToast(
        err.message || (isEn ? 'Failed to upload receipt.' : 'Không thể tải lên biên lai.'),
        'error'
      );
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Admin Quick Verification handlers (for testers and administrators)
  const isAdmin = currentUser?.email === 'minh.nguyen@studymind.edu.vn' || (currentUser as any)?.role === 'admin';

  const handleAdminApprove = async () => {
    if (!order) return;
    setIsAdminProcessing(true);
    try {
      const res = await apiAdminApproveOrder(order.id);
      if (res.success && res.order) {
        setOrder(res.order);
        showToast(
          isEn
            ? '🎉 Approved and activated Premium plan!'
            : '🎉 Đã duyệt kích hoạt gói Premium thành công!',
          'success'
        );
        if (refreshUserData) {
          await refreshUserData();
        }
      }
    } catch (err: any) {
      showToast(
        err.message || (isEn ? 'Error approving order.' : 'Lỗi khi phê duyệt đơn hàng.'),
        'error'
      );
    } finally {
      setIsAdminProcessing(false);
    }
  };

  const handleAdminReject = async () => {
    if (!order) return;
    const reason = window.prompt(
      isEn ? 'Enter reason for rejecting this order:' : 'Nhập lý do từ chối đơn hàng:',
      isEn
        ? 'Transfer amount mismatch or bank statement not yet received.'
        : 'Số tiền không khớp hoặc chưa nhận được sao kê ngân hàng.'
    );
    if (reason === null) return;
    setIsAdminProcessing(true);
    try {
      const res = await apiAdminRejectOrder(order.id, reason);
      if (res.success && res.order) {
        setOrder(res.order);
        showToast(isEn ? 'Order rejected.' : 'Đã từ chối đơn hàng.', 'info');
      }
    } catch (err: any) {
      showToast(
        err.message || (isEn ? 'Error rejecting order.' : 'Lỗi khi từ chối đơn hàng.'),
        'error'
      );
    } finally {
      setIsAdminProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('premium')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title={isEn ? 'Back to pricing plans' : 'Quay lại danh sách gói cước'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isEn ? 'Premium Plan Checkout' : 'Thanh toán gói Premium'}</span>
              <span className="p-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <Crown className="w-4 h-4" />
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Secure transfer • Automatic activation after verification • Digital invoice'
                : 'Chuyển khoản an toàn • Tự động kích hoạt sau khi xác minh • Hóa đơn điện tử'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isEn ? 'Transaction History' : 'Lịch sử giao dịch'}
          </button>
        </div>
      </div>

      {/* 1. STATE: LOADING */}
      {uiState === 'loading' && (
        <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <RefreshCw className="w-9 h-9 text-indigo-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEn ? 'Loading order details...' : 'Đang tải thông tin đơn hàng...'}
          </h3>
          <p className="text-xs text-slate-400">
            {isEn ? 'Please wait a moment.' : 'Vui lòng chờ trong giây lát.'}
          </p>
        </div>
      )}

      {/* 2. STATE: UNAUTHORIZED */}
      {uiState === 'unauthorized' && (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEn ? 'Please sign in to checkout' : 'Vui lòng đăng nhập để thanh toán'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isEn
              ? 'You need to sign in to your StudySync AI student account to view and complete this order.'
              : 'Bạn cần đăng nhập vào tài khoản sinh viên StudySync AI để xem và thanh toán đơn hàng này.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => openAuthModal('login')}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              {isEn ? 'Sign In Now' : 'Đăng nhập ngay'}
            </button>
            <button
              onClick={() => setActiveTab('premium')}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              {isEn ? 'View Plans' : 'Xem các gói cước'}
            </button>
          </div>
        </div>
      )}

      {/* 3. STATE: NOT FOUND / ERROR */}
      {uiState === 'not_found' && (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEn ? 'Order Not Found' : 'Không tìm thấy thông tin đơn hàng'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {errorMessage ||
              (isEn
                ? 'This order ID does not exist or you do not have permission to view it.'
                : 'Mã đơn hàng không tồn tại hoặc bạn không có quyền xem đơn hàng này.')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('premium')}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>{isEn ? 'Select Premium Plan' : 'Chọn gói Premium'}</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              {isEn ? 'Back to Home' : 'Về trang chủ'}
            </button>
          </div>
        </div>
      )}

      {/* 4. READY: ORDER LOADED SUCCESSFULLY */}
      {uiState === 'ready' && order && (
        <div className="space-y-6">
          {/* Status Alert Banner */}
          {order.status === 'PAID' && (
            <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-900 dark:text-white">
                    {isEn
                      ? 'Order has been paid successfully!'
                      : 'Đơn hàng đã được thanh toán thành công!'}
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {isEn ? (
                      <>
                        Your account has been upgraded to <strong>StudySync AI Premium</strong>.
                      </>
                    ) : (
                      <>
                        Tài khoản của bạn đã được nâng cấp lên gói <strong>StudySync AI Premium</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  {isEn ? 'Go to Dashboard' : 'Vào Dashboard'}
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 dark:text-emerald-200 font-bold text-xs hover:bg-emerald-100/50 transition-colors"
                >
                  {isEn ? 'View Invoice' : 'Xem hóa đơn'}
                </button>
              </div>
            </div>
          )}

          {order.status === 'WAITING_VERIFICATION' && (
            <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-900 dark:text-white">
                    {isEn
                      ? 'Your payment confirmation is awaiting verification'
                      : 'Yêu cầu thanh toán của bạn đang chờ xác minh'}
                  </h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {isEn
                      ? `We recorded your transfer confirmation at ${
                          order.customerConfirmedAt
                            ? new Date(order.customerConfirmedAt).toLocaleTimeString('en-US')
                            : 'just now'
                        }. An administrator will verify the bank transfer and activate your plan shortly!`
                      : `Hệ thống đã ghi nhận xác nhận chuyển khoản của bạn lúc ${
                          order.customerConfirmedAt
                            ? new Date(order.customerConfirmedAt).toLocaleTimeString('vi-VN')
                            : 'vừa xong'
                        }. Quản trị viên sẽ kiểm tra sao kê ngân hàng và kích hoạt gói sớm nhất có thể!`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Auto-syncing...' : 'Đang tự động đồng bộ...'}</span>
                </span>
              </div>
            </div>
          )}

          {order.status === 'REJECTED' && (
            <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900 dark:text-white">
                    {isEn ? 'Payment Not Approved' : 'Thanh toán không được phê duyệt'}
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {isEn ? 'Reason: ' : 'Lý do: '}
                    <strong>
                      {order.rejectionReason ||
                        (isEn
                          ? 'Matching bank transfer not yet received.'
                          : 'Chưa nhận được giao dịch chuyển khoản tương ứng.')}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('premium')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shrink-0"
              >
                {isEn ? 'Create New Order' : 'Tạo đơn hàng mới'}
              </button>
            </div>
          )}

          {/* Admin Evaluation Panel (Only visible to admin / tester) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <span>
                    {isEn ? 'Administrator Panel (Admin Tools)' : 'Khu vực Quản trị viên (Admin Tools)'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                  {isEn ? 'Account: ' : 'Tài khoản: '}
                  {currentUser?.email}
                </span>
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                {isEn
                  ? 'As an Administrator, you can verify the bank statement and directly approve or reject this order to complete the test flow:'
                  : 'Với tư cách là Quản trị viên, bạn có thể kiểm tra sao kê và trực tiếp phê duyệt hoặc từ chối đơn hàng này để hoàn thành luồng kiểm thử:'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAdminApprove}
                  disabled={isAdminProcessing || order.status === 'PAID'}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isEn ? 'Approve Premium Activation' : 'Duyệt kích hoạt Premium (Approve)'}
                  </span>
                </button>
                <button
                  onClick={handleAdminReject}
                  disabled={isAdminProcessing || order.status === 'PAID'}
                  className="px-3.5 py-1.5 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-100 disabled:opacity-50 font-bold text-[11px] transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Reject Order' : 'Từ chối đơn (Reject)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Main 2-Column Grid: Left Bank Transfer & QR, Right Summary & Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Bank Details & QR (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Method Selection Tabs */}
              <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bank')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedMethod === 'bank'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'TPBank Transfer (Recommended)' : 'Chuyển khoản TPBank (Khuyên dùng)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('momo')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedMethod === 'momo'
                      ? 'bg-white dark:bg-slate-800 text-pink-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded bg-pink-600 text-white flex items-center justify-center text-[7px]">Mo</span>
                  <span>{isEn ? 'MoMo Wallet' : 'Ví MoMo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod('zalopay')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedMethod === 'zalopay'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white flex items-center justify-center text-[7px]">ZLP</span>
                  <span>{isEn ? 'ZaloPay Wallet' : 'Ví ZaloPay'}</span>
                </button>
              </div>

              {/* Notice for MoMo or ZaloPay */}
              {selectedMethod === 'momo' && (
                <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800 text-pink-900 dark:text-pink-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="w-4 h-4 rounded bg-pink-600 text-white flex items-center justify-center text-[8px] font-black">Mo</span>
                    <span>{isEn ? 'Pay via MoMo Wallet' : 'Thanh toán bằng Ví MoMo'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {isEn ? (
                      <>
                        Please open the <strong>MoMo</strong> app and scan the <strong>MoMo QR code</strong> below to complete your payment. Please enter the exact <strong>transfer message</strong> so the system can automatically verify and activate your plan.
                      </>
                    ) : (
                      <>
                        Vui lòng mở ứng dụng <strong>MoMo</strong> và quét <strong>mã QR MoMo</strong> bên dưới để hoàn tất thanh toán. Vui lòng ghi chính xác <strong>nội dung chuyển khoản</strong> để hệ thống tự động nhận diện và kích hoạt gói ngay.
                      </>
                    )}
                  </p>
                </div>
              )}

              {selectedMethod === 'zalopay' && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center text-[8px] font-black">ZLP</span>
                    <span>{isEn ? 'Pay via ZaloPay Wallet' : 'Thanh toán bằng Ví ZaloPay'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {isEn ? (
                      <>
                        Please open the <strong>ZaloPay</strong> app (or Zalo app) and scan the <strong>ZaloPay QR code</strong> below to complete your payment. Please enter the exact <strong>transfer message</strong> so the system can automatically verify and activate your plan.
                      </>
                    ) : (
                      <>
                        Vui lòng mở ứng dụng <strong>ZaloPay</strong> (hoặc ứng dụng Zalo) và quét <strong>mã QR ZaloPay</strong> bên dưới để hoàn tất thanh toán. Vui lòng ghi chính xác <strong>nội dung chuyển khoản</strong> để hệ thống tự động nhận diện và kích hoạt gói ngay.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Payment Details Card (Bank, MoMo or ZaloPay) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {selectedMethod === 'momo' ? (
                      <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        Mo
                      </div>
                    ) : selectedMethod === 'zalopay' ? (
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        ZLP
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        TPB
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedMethod === 'momo'
                          ? isEn
                            ? 'MoMo Wallet Payment Information'
                            : 'Thông tin thanh toán qua Ví MoMo'
                          : selectedMethod === 'zalopay'
                          ? isEn
                            ? 'ZaloPay Wallet Payment Information'
                            : 'Thông tin thanh toán qua Ví ZaloPay'
                          : isEn
                          ? 'Bank Transfer Information'
                          : 'Thông tin chuyển khoản ngân hàng'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {selectedMethod === 'momo'
                          ? isEn
                            ? 'Scan the MoMo QR code or transfer with the message below.'
                            : 'Quét mã QR MoMo hoặc chuyển khoản với nội dung bên dưới.'
                          : selectedMethod === 'zalopay'
                          ? isEn
                            ? 'Scan the ZaloPay QR code or transfer with the message below.'
                            : 'Quét mã QR ZaloPay hoặc chuyển khoản với nội dung bên dưới.'
                          : isEn
                          ? 'Please include the exact order code in the transfer message.'
                          : bankConfig.instructions || 'Vui lòng ghi đúng mã đơn hàng trong nội dung chuyển khoản.'}
                      </p>
                    </div>
                  </div>
                  {order.status === 'PENDING' && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(timeLeft)}</span>
                    </span>
                  )}
                </div>

                {/* Account Details Rows */}
                <div className="space-y-3 text-xs">
                  {/* Bank/Provider Name */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">
                      {selectedMethod === 'momo' || selectedMethod === 'zalopay'
                        ? isEn
                          ? 'Payment Gateway:'
                          : 'Cổng thanh toán:'
                        : isEn
                        ? 'Beneficiary Bank:'
                        : 'Ngân hàng thụ hưởng:'}
                    </span>
                    <strong className="text-slate-900 dark:text-white text-sm font-bold">
                      {selectedMethod === 'momo'
                        ? isEn
                          ? 'MoMo E-Wallet'
                          : 'Ví điện tử MoMo'
                        : selectedMethod === 'zalopay'
                        ? isEn
                          ? 'ZaloPay E-Wallet'
                          : 'Ví điện tử ZaloPay'
                        : bankConfig.bankName}
                    </strong>
                  </div>

                  {/* Account / Phone Number */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">
                      {selectedMethod === 'momo' || selectedMethod === 'zalopay'
                        ? isEn
                          ? 'Account / Phone Number:'
                          : 'Số tài khoản / Điện thoại nhận:'
                        : isEn
                        ? 'Account Number:'
                        : 'Số tài khoản:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                        {selectedMethod === 'zalopay' ? '0825255447' : bankConfig.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            selectedMethod === 'zalopay' ? '0825255447' : bankConfig.accountNumber,
                            'accNumber',
                            isEn ? 'account number' : 'số tài khoản'
                          )
                        }
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isEn ? 'Copy account number' : 'Sao chép số tài khoản'}
                      >
                        {copiedField === 'accNumber' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Account Name */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">{isEn ? 'Account Holder:' : 'Chủ tài khoản:'}</span>
                    <strong className="text-slate-900 dark:text-white uppercase font-bold tracking-wide">
                      {selectedMethod === 'zalopay' ? 'Huyền Anh (DINH THI HUYEN ANH)' : bankConfig.accountName}
                    </strong>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                    <span className="text-slate-500">{isEn ? 'Exact Amount:' : 'Số tiền chính xác:'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {order.amount.toLocaleString('vi-VN')} đ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(String(order.amount), 'amount', isEn ? 'amount' : 'số tiền')}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isEn ? 'Copy amount' : 'Sao chép số tiền'}
                      >
                        {copiedField === 'amount' ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Transfer Content */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        {isEn ? 'Transfer Message (Required exact match):' : 'Nội dung chuyển tiền (Bắt buộc ghi đúng):'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(transferContent, 'content', isEn ? 'transfer message' : 'nội dung chuyển khoản')
                        }
                        className="px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'content' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isEn ? 'Copy' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-sm font-black text-amber-950 dark:text-amber-200 tracking-wider p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-500/20 select-all break-all">
                      {transferContent}
                    </div>
                  </div>
                </div>

                {/* QR Code Section:
                    - MoMo: Hình 2 (/images/momo_qr.png)
                    - ZaloPay: Hình 1 (/images/zalopay_qr.png)
                    - Ngân hàng TPBank: Giữ nguyên (/images/tpbank_qr.png)
                */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {selectedMethod === 'momo'
                        ? isEn
                          ? 'MoMo Wallet Payment QR Code'
                          : 'Mã QR thanh toán Ví MoMo'
                        : selectedMethod === 'zalopay'
                        ? isEn
                          ? 'ZaloPay Wallet Payment QR Code'
                          : 'Mã QR thanh toán Ví ZaloPay'
                        : isEn
                        ? 'Quick Payment QR Code'
                        : 'Mã QR thanh toán nhanh'}
                    </h4>

                    {(() => {
                      const activeQrImage =
                        selectedMethod === 'momo'
                          ? (bankConfig.momoQrUrl || '/images/momo_qr.png')
                          : selectedMethod === 'zalopay'
                          ? (bankConfig.zalopayQrUrl || '/images/zalopay_qr.png')
                          : (bankConfig.qrImageUrl || '/images/tpbank_qr.png');

                      const activeDownloadName =
                        selectedMethod === 'momo'
                          ? `QR_MoMo_${order.orderCode || order.id}.png`
                          : selectedMethod === 'zalopay'
                          ? `QR_ZaloPay_${order.orderCode || order.id}.png`
                          : `QR_ThanhToan_${order.orderCode || order.id}.jpg`;

                      const methodLabel =
                        selectedMethod === 'momo'
                          ? 'MoMo'
                          : selectedMethod === 'zalopay'
                          ? 'ZaloPay'
                          : 'TPBank';

                      return (
                        <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                          <img
                            key={activeQrImage}
                            src={activeQrImage}
                            alt={isEn ? `${methodLabel} Payment QR Code` : `QR Code thanh toán ${methodLabel}`}
                            referrerPolicy="no-referrer"
                            className="w-52 h-auto max-h-64 mx-auto object-contain rounded-xl"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <a
                            href={activeQrImage}
                            download={activeDownloadName}
                            className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline block"
                          >
                            {isEn ? `Download ${methodLabel} QR Code` : `Tải ảnh mã QR ${methodLabel} về máy`}
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Receipt Upload Card (Requirement 4) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isEn ? 'Upload Transfer Receipt (Optional)' : 'Tải lên ảnh biên lai chuyển khoản (Tùy chọn)'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isEn
                        ? 'Attach a screenshot of your successful transfer for faster verification.'
                        : 'Đính kèm ảnh chụp màn hình giao dịch chuyển tiền thành công để được duyệt nhanh hơn.'}
                    </p>
                  </div>
                  {receiptPreview && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {isEn ? 'Receipt Attached' : 'Đã đính kèm biên lai'}
                    </span>
                  )}
                </div>

                {receiptPreview ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <img
                      src={receiptPreview}
                      alt={isEn ? 'Payment receipt' : 'Biên lai thanh toán'}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
                    />
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isEn ? 'Receipt saved on server' : 'Biên lai đã được lưu trên máy chủ'}
                      </div>
                      <a
                        href={receiptPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>{isEn ? 'View original image' : 'Xem ảnh kích thước gốc'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleReceiptFileChange}
                      disabled={isUploadingReceipt}
                      className="hidden"
                    />
                    {isUploadingReceipt ? (
                      <>
                        <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isEn ? 'Uploading receipt image...' : 'Đang tải ảnh biên lai lên máy chủ...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-7 h-7 text-indigo-500 mb-2" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isEn ? 'Click here to upload receipt image' : 'Bấm vào đây để tải ảnh biên lai'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {isEn ? 'Supports JPG, PNG, WEBP (max 10MB)' : 'Hỗ trợ định dạng JPG, PNG, WEBP (tối đa 10MB)'}
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary, Step Instructions & Action Button (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Order Summary Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>{isEn ? 'Order Summary' : 'Chi tiết đơn hàng'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    #{order.orderCode || order.id.slice(-6)}
                  </span>
                </h3>

                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isEn ? 'Subscription Plan:' : 'Gói đăng ký:'}</span>
                    <strong className="text-slate-900 dark:text-white">Mầm Study Premium</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isEn ? 'Duration:' : 'Thời hạn sử dụng:'}</span>
                    <strong className="text-slate-900 dark:text-white">
                      {order.packageId === 'premium_yearly'
                        ? isEn
                          ? '12 Months (1 Year)'
                          : '12 Tháng (1 Năm)'
                        : isEn
                        ? '1 Month (30 Days)'
                        : '1 Tháng (30 Ngày)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isEn ? 'Order ID:' : 'Mã đơn hàng:'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isEn ? 'Status:' : 'Trạng thái:'}</span>
                    <span
                      className={`font-black uppercase text-[11px] ${
                        order.status === 'PAID'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : order.status === 'WAITING_VERIFICATION'
                          ? 'text-amber-600 dark:text-amber-400'
                          : order.status === 'REJECTED' || order.status === 'FAILED'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600'
                      }`}
                    >
                      {order.status === 'PAID'
                        ? isEn
                          ? 'PAID'
                          : 'ĐÃ THANH TOÁN'
                        : order.status === 'WAITING_VERIFICATION'
                        ? isEn
                          ? 'WAITING VERIFICATION'
                          : 'CHỜ XÁC MINH'
                        : order.status === 'REJECTED'
                        ? isEn
                          ? 'REJECTED'
                          : 'TỪ CHỐI'
                        : isEn
                        ? 'PENDING PAYMENT'
                        : 'CHỜ THANH TOÁN (PENDING)'}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {isEn ? 'Total Amount:' : 'Tổng thanh toán:'}
                    </span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {order.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Primary Action Button: "Tôi đã thanh toán" (Requirement 3 & 4) */}
                {order.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={handleCustomerConfirmPayment}
                    disabled={isConfirming}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    {isConfirming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{isEn ? 'Submitting notification...' : 'Đang gửi thông báo...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isEn ? 'I Have Paid' : 'Tôi đã thanh toán'}</span>
                      </>
                    )}
                  </button>
                )}

                {order.status === 'WAITING_VERIFICATION' && (
                  <div className="w-full py-3 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-center text-xs font-bold mt-4 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{isEn ? 'Waiting for Admin Verification' : 'Đang chờ ban quản trị xác minh'}</span>
                  </div>
                )}

                {order.status === 'PAID' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>{isEn ? 'Go to Study Dashboard Now' : 'Vào bảng điều khiển học tập ngay'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Step-by-Step Instructions Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>{isEn ? 'Simple 3-Step Guide' : 'Hướng dẫn 3 bước đơn giản'}</span>
                </h3>

                <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                  <li className="pl-1">
                    {isEn ? (
                      <>
                        Open any banking app or e-wallet and select <strong>24/7 Fast Transfer</strong>.
                      </>
                    ) : (
                      <>
                        Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ, chọn tính năng <strong>Chuyển tiền nhanh 24/7</strong>.
                      </>
                    )}
                  </li>
                  <li className="pl-1">
                    {isEn ? (
                      <>
                        Enter <strong>Account Number: {bankConfig.accountNumber}</strong> at <strong>{bankConfig.bankName}</strong>.
                      </>
                    ) : (
                      <>
                        Nhập <strong>Số tài khoản: {bankConfig.accountNumber}</strong> tại <strong>{bankConfig.bankName}</strong>.
                      </>
                    )}
                  </li>
                  <li className="pl-1">
                    {isEn ? (
                      <>
                        Enter the exact transfer message: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{transferContent}</strong> and amount <strong>{order.amount.toLocaleString('vi-VN')} đ</strong>.
                      </>
                    ) : (
                      <>
                        Điền đúng nội dung chuyển khoản: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{transferContent}</strong> và số tiền <strong>{order.amount.toLocaleString('vi-VN')} đ</strong>.
                      </>
                    )}
                  </li>
                  <li className="pl-1">
                    {isEn ? (
                      <>
                        Click <strong>“I Have Paid”</strong> once completed so the system moves your order to verification.
                      </>
                    ) : (
                      <>
                        Bấm <strong>“Tôi đã thanh toán”</strong> sau khi hoàn tất để hệ thống chuyển sang trạng thái chờ xác minh.
                      </>
                    )}
                  </li>
                </ol>

                <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                  {isEn
                    ? '* 24/7 technical support via student hotline and email if you need urgent assistance.'
                    : '* Hỗ trợ kỹ thuật 24/7 qua hotline và email hỗ trợ sinh viên nếu cần trợ giúp khẩn cấp.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


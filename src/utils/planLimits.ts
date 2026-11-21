import { User, Usage } from '../types';

export const FREE_LIMITS = {
  maxSubjects: 4,
  maxAudioMinutesPerMonth: 300,
  maxAiRequestsPerDay: 20,
  maxAiRequestsPerMonth: 600,
};

export const PREMIUM_LIMITS = {
  maxSubjects: 9999, // Không giới hạn môn học
  maxAudioMinutesPerMonth: 3000,
  maxAiRequestsPerDay: 500,
  maxAiRequestsPerMonth: 15000,
};

/**
 * Kiểm tra xem người dùng có phải là tài khoản Premium hợp lệ hay không
 */
export function isPremium(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.plan === 'premium' && (user.planStatus === 'active' || user.planStatus === 'trial');
}

/**
 * Lấy giới hạn số lượng môn học được phép tạo
 */
export function getSubjectLimit(user: User | null | undefined): number {
  if (isPremium(user)) {
    return PREMIUM_LIMITS.maxSubjects;
  }
  return FREE_LIMITS.maxSubjects;
}

/**
 * Kiểm tra người dùng có thể tạo thêm môn học hay không (Gói Free tối đa 4 môn)
 */
export function canCreateSubject(user: User | null | undefined, currentCount: number): boolean {
  const limit = getSubjectLimit(user);
  return currentCount < limit;
}

/**
 * Kiểm tra xem người dùng có thể dùng tính năng AI (dựa trên hạn mức)
 */
export function canUseAiFeature(
  user: User | null | undefined,
  usage: Usage | null | undefined,
  _feature?: string
): boolean {
  if (isPremium(user)) return true;
  if (!usage) return true;
  // Free: Giới hạn 600 lượt/tháng
  return usage.aiRequests < FREE_LIMITS.maxAiRequestsPerMonth;
}

/**
 * Lấy số lượng tài nguyên còn lại trong tháng
 */
export function getRemainingUsage(
  user: User | null | undefined,
  usage: Usage | null | undefined
) {
  const premium = isPremium(user);
  const maxAudio = premium ? PREMIUM_LIMITS.maxAudioMinutesPerMonth : FREE_LIMITS.maxAudioMinutesPerMonth;
  const maxAi = premium ? PREMIUM_LIMITS.maxAiRequestsPerMonth : FREE_LIMITS.maxAiRequestsPerMonth;

  const currentAudio = usage?.audioMinutes || 0;
  const currentAi = usage?.aiRequests || 0;

  return {
    isPremium: premium,
    audioMinutesUsed: currentAudio,
    audioMinutesLimit: maxAudio,
    remainingAudioMinutes: Math.max(0, maxAudio - currentAudio),
    audioPercent: Math.min(100, Math.round((currentAudio / maxAudio) * 100)),
    aiRequestsUsed: currentAi,
    aiRequestsLimit: maxAi,
    remainingAiRequests: Math.max(0, maxAi - currentAi),
    aiPercent: Math.min(100, Math.round((currentAi / maxAi) * 100)),
  };
}

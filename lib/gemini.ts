import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

/**
 * Централизованный модуль конфигурации Google Gemini API (Backend-Only).
 * Đọc cấu hình trực tiếp từ biến môi trường của server:
 * - GEMINI_API_KEY: Server-side API key
 * - GEMINI_MODEL: Model ID chính (mặc định: gemini-3-flash-preview)
 * - GEMINI_TRANSCRIBE_MODEL: Model ID cho audio transcription
 *
 * Bảo mật: Tuyệt đối không lộ API key ra frontend hoặc console log.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

export function getConfiguredModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getConfiguredTranscribeModelName(): string {
  const configured = process.env.GEMINI_TRANSCRIBE_MODEL?.trim();
  if (configured && configured !== "gemini-3.5-transcribe") {
    return configured;
  }
  return getConfiguredModelName();
}

export const GEMINI_MODEL_NAME = getConfiguredModelName();
export const GEMINI_CHAT_MODEL = GEMINI_MODEL_NAME;
export const GEMINI_TRANSCRIBE_MODEL_NAME = getConfiguredTranscribeModelName();
export const GEMINI_TRANSCRIBE_MODEL = GEMINI_TRANSCRIBE_MODEL_NAME;

export const FALLBACK_GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

// Ghi nhớ các model bị giới hạn limit: 0 trên Free Tier (10 phút) hoặc bị rate-limit RPM tạm thời (45 giây)
const freeTierZeroLimitCache = new Map<string, number>();
const rateLimitedModelCache = new Map<string, number>();
let lastWorkingModel: string = getConfiguredModelName();

export function getActiveModelName(): string {
  return lastWorkingModel || getConfiguredModelName();
}

export const GEMINI_MISSING_KEY_MESSAGE =
  "Hệ thống AI chưa được cấu hình. Máy chủ thiếu biến môi trường GEMINI_API_KEY.";

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

export function hasGeminiApiKey(): boolean {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  return (
    Boolean(rawKey) &&
    rawKey !== "YOUR_GEMINI_API_KEY" &&
    rawKey !== "your_gemini_api_key_here" &&
    rawKey !== "<server-side-api-key>" &&
    rawKey.length >= 20
  );
}

export function getMaskedApiKey(): string {
  if (!hasGeminiApiKey()) return "NOT_CONFIGURED";
  return "CONFIGURED_SERVER_KEY";
}

/**
 * Kiểm tra trạng thái cấu hình GEMINI_API_KEY trên máy chủ.
 */
export function checkGeminiConfig(): {
  configured: boolean;
  keyPreview: string;
  model: string;
  activeModel: string;
  transcribeModel: string;
  errorCode?: string;
  errorMessage?: string;
} {
  const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  const model = getConfiguredModelName();
  const activeModel = getActiveModelName();
  const transcribeModel = getConfiguredTranscribeModelName();

  if (
    !rawKey ||
    rawKey === "YOUR_GEMINI_API_KEY" ||
    rawKey === "your_gemini_api_key_here" ||
    rawKey === "<server-side-api-key>"
  ) {
    return {
      configured: false,
      keyPreview: "NOT_SET",
      model,
      activeModel,
      transcribeModel,
      errorCode: "AI_NOT_CONFIGURED",
      errorMessage: GEMINI_MISSING_KEY_MESSAGE,
    };
  }

  if (rawKey.length < 20) {
    return {
      configured: false,
      keyPreview: "INVALID_FORMAT",
      model,
      activeModel,
      transcribeModel,
      errorCode: "AI_INVALID_API_KEY",
      errorMessage:
        "Cấu hình dịch vụ AI không hợp lệ (GEMINI_API_KEY sai định dạng).",
    };
  }

  return {
    configured: true,
    keyPreview: "CONFIGURED",
    model,
    activeModel,
    transcribeModel,
  };
}

/**
 * Khởi tạo và trả về GoogleGenAI client.
 * Trả về null nếu chưa cấu hình API key.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const status = checkGeminiConfig();
  if (!status.configured) {
    return null;
  }

  const rawKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  if (!cachedClient || cachedKey !== rawKey) {
    cachedClient = new GoogleGenAI({
      apiKey: rawKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    cachedKey = rawKey;
  }

  return cachedClient;
}

export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_INVALID_API_KEY"
  | "AI_AUTH_ERROR"
  | "AI_MODEL_NOT_FOUND"
  | "AI_PERMISSION_DENIED"
  | "AI_QUOTA_EXCEEDED"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_EMPTY_RESPONSE"
  | "AI_INVALID_RESPONSE"
  | "AI_INPUT_EMPTY"
  | "AUDIO_FILE_MISSING"
  | "UNSUPPORTED_AUDIO_FORMAT"
  | "DOCUMENT_TEXT_EMPTY"
  | "PREMIUM_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_REQUEST_FAILED"
  | "AI_GENERAL_ERROR";

export const AI_ERROR_MESSAGES_VI: Record<AiErrorCode, string> = {
  AI_NOT_CONFIGURED: "Hệ thống AI chưa được cấu hình.",
  AI_INVALID_API_KEY: "API key của dịch vụ AI không hợp lệ hoặc đã bị thu hồi.",
  AI_AUTH_ERROR: "Cấu hình xác thực dịch vụ AI không hợp lệ.",
  AI_MODEL_NOT_FOUND: "Mô hình AI được chỉ định không tồn tại hoặc không được hỗ trợ trong dự án hiện tại.",
  AI_PERMISSION_DENIED: "Dịch vụ AI bị từ chối quyền truy cập hoặc dự án chưa bật thanh toán (Billing).",
  AI_QUOTA_EXCEEDED: "Hệ thống AI đã hết hạn mức sử dụng (Quota). Vui lòng thử lại sau hoặc kiểm tra gói Billing.",
  AI_RATE_LIMITED: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ vài giây rồi thử lại.",
  AI_TIMEOUT: "Yêu cầu AI xử lý quá thời gian cho phép. Vui lòng thử lại.",
  AI_EMPTY_RESPONSE: "AI không tạo được câu trả lời cho nội dung này. Vui lòng thử lại.",
  AI_INVALID_RESPONSE: "Dữ liệu trả về từ AI không đúng định dạng. Vui lòng thử lại.",
  AI_INPUT_EMPTY: "Vui lòng nhập nội dung hoặc câu hỏi trước khi gửi.",
  AUDIO_FILE_MISSING: "Không tìm thấy dữ liệu âm thanh hợp lệ để phân tích.",
  UNSUPPORTED_AUDIO_FORMAT: "Định dạng âm thanh không được hỗ trợ. Vui lòng sử dụng WebM, MP3, WAV, M4A hoặc OGG.",
  DOCUMENT_TEXT_EMPTY: "Tài liệu không có nội dung văn bản để phân tích.",
  PREMIUM_REQUIRED: "Tính năng này chỉ dành cho tài khoản Premium.",
  UNAUTHORIZED: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
  FORBIDDEN: "Bạn không có quyền truy cập vào tài nguyên này.",
  AI_SERVICE_UNAVAILABLE: "Máy chủ AI đang quá tải tạm thời. Vui lòng thử lại sau ít phút.",
  AI_REQUEST_FAILED: "Không thể hoàn tất yêu cầu AI. Vui lòng thử lại.",
  AI_GENERAL_ERROR: "Đã xảy ra lỗi khi xử lý yêu cầu AI. Vui lòng thử lại.",
};

/**
 * Làm sạch câu trả lời văn bản từ AI để hiển thị đẹp trên UI.
 */
export function cleanAiResponse(rawText: string | undefined | null): string {
  if (!rawText) return "";
  return String(rawText)
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/**
 * Chuẩn hóa phản hồi thành công từ API AI:
 * Đảm bảo có cả `{ success: true, data: {...}, error: null }` và các trường top-level tương thích ngược.
 */
export function buildAiSuccessResponse<T extends Record<string, any>>(
  data: T,
  extraTopLevel?: Record<string, any>
) {
  return {
    success: true,
    data,
    error: null,
    ...data,
    ...(extraTopLevel || {}),
  };
}

/**
 * Chuẩn hóa phản hồi lỗi từ API AI:
 * Đảm bảo có `{ success: false, data: null, error: { code, message }, errorCode, message }`
 */
export function buildAiErrorResponse(
  code: AiErrorCode | string,
  customMessage?: string,
  extra?: Record<string, any>
) {
  const defaultMsg =
    AI_ERROR_MESSAGES_VI[code as AiErrorCode] ||
    AI_ERROR_MESSAGES_VI.AI_GENERAL_ERROR;
  const message = customMessage || defaultMsg;
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
    errorCode: code,
    message,
    ...(extra || {}),
  };
}

export interface ParsedGeminiError {
  status: number;
  httpStatus: number;
  errorCode: AiErrorCode;
  userMessage: string;
  message: string;
  technicalDetails: string;
  retryable: boolean;
  canRetry: boolean;
  isDailyQuota: boolean;
  isZeroFreeTierLimit?: boolean;
  retryAfter?: string | number;
  isModelNotFound?: boolean;
  modelName?: string;
}

function extractRetryAfterFromMessage(rawMessage: string): string | number | undefined {
  const retryInMatch = rawMessage.match(/Please retry in ([0-9hms.]+)/i);
  if (retryInMatch && retryInMatch[1]) {
    return retryInMatch[1];
  }
  const retryDelayMatch = rawMessage.match(/"retryDelay"\s*:\s*"([^"]+)"/i);
  if (retryDelayMatch && retryDelayMatch[1]) {
    return retryDelayMatch[1];
  }
  return undefined;
}

/**
 * Phân tích lỗi từ Gemini SDK để trả về mã lỗi chuẩn và HTTP status phù hợp.
 */
export function parseGeminiError(error: any, modelName?: string): ParsedGeminiError {
  const rawMessage = error?.message || String(error || "Unknown Gemini error");
  const errCode = error?.code || error?.status || "";
  const lower = rawMessage.toLowerCase();
  const targetModel = modelName || error?.modelName || getConfiguredModelName();

  const buildResult = (
    status: number,
    errorCode: AiErrorCode,
    userMessage: string,
    retryable: boolean,
    extra?: {
      isDailyQuota?: boolean;
      isZeroFreeTierLimit?: boolean;
      retryAfter?: string | number;
      isModelNotFound?: boolean;
    }
  ): ParsedGeminiError => ({
    status,
    httpStatus: status,
    errorCode,
    userMessage,
    message: userMessage,
    technicalDetails: rawMessage,
    retryable,
    canRetry: retryable,
    isDailyQuota: Boolean(extra?.isDailyQuota),
    isZeroFreeTierLimit: Boolean(extra?.isZeroFreeTierLimit),
    retryAfter: extra?.retryAfter,
    isModelNotFound: extra?.isModelNotFound,
    modelName: targetModel,
  });

  // 0. Lỗi ứng dụng chủ động gắn code
  if (errCode === "AI_INPUT_EMPTY") {
    return buildResult(
      400,
      "AI_INPUT_EMPTY",
      rawMessage || AI_ERROR_MESSAGES_VI.AI_INPUT_EMPTY,
      false
    );
  }

  if (errCode === "AUDIO_FILE_MISSING") {
    return buildResult(
      400,
      "AUDIO_FILE_MISSING",
      rawMessage || AI_ERROR_MESSAGES_VI.AUDIO_FILE_MISSING,
      false
    );
  }

  if (errCode === "UNSUPPORTED_AUDIO_FORMAT") {
    return buildResult(
      400,
      "UNSUPPORTED_AUDIO_FORMAT",
      rawMessage || AI_ERROR_MESSAGES_VI.UNSUPPORTED_AUDIO_FORMAT,
      false
    );
  }

  if (errCode === "DOCUMENT_TEXT_EMPTY") {
    return buildResult(
      400,
      "DOCUMENT_TEXT_EMPTY",
      rawMessage || AI_ERROR_MESSAGES_VI.DOCUMENT_TEXT_EMPTY,
      false
    );
  }

  if (errCode === "AI_EMPTY_RESPONSE") {
    return buildResult(
      502,
      "AI_EMPTY_RESPONSE",
      AI_ERROR_MESSAGES_VI.AI_EMPTY_RESPONSE,
      true
    );
  }

  if (errCode === "AI_INVALID_RESPONSE" || errCode === "AI_PARSE_ERROR") {
    return buildResult(
      502,
      "AI_INVALID_RESPONSE",
      AI_ERROR_MESSAGES_VI.AI_INVALID_RESPONSE,
      true
    );
  }

  // 1. Chưa cấu hình API Key
  if (
    errCode === "AI_NOT_CONFIGURED" ||
    errCode === "AI_CONFIG_MISSING" ||
    errCode === "GEMINI_API_KEY_MISSING" ||
    lower.includes("not configured") ||
    lower.includes("thiếu biến môi trường gemini_api_key")
  ) {
    return buildResult(
      503,
      "AI_NOT_CONFIGURED",
      AI_ERROR_MESSAGES_VI.AI_NOT_CONFIGURED,
      false
    );
  }

  // 2. API Key sai hoặc không hợp lệ (401)
  if (
    errCode === "AI_INVALID_API_KEY" ||
    errCode === "AI_KEY_INVALID" ||
    errCode === 401 ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("unauthenticated") ||
    (lower.includes("400") && lower.includes("key"))
  ) {
    return buildResult(
      401,
      "AI_INVALID_API_KEY",
      AI_ERROR_MESSAGES_VI.AI_INVALID_API_KEY,
      false
    );
  }

  // 3. Model không tồn tại hoặc không hỗ trợ (404)
  if (
    errCode === "AI_MODEL_NOT_FOUND" ||
    errCode === 404 ||
    lower.includes("404") ||
    lower.includes("not_found") ||
    lower.includes("is not found for api version") ||
    lower.includes("is no longer available") ||
    lower.includes("model not found")
  ) {
    return buildResult(
      404,
      "AI_MODEL_NOT_FOUND",
      `Mô hình AI "${targetModel}" không tồn tại hoặc không khả dụng trong API/project hiện tại. Vui lòng kiểm tra lại GEMINI_MODEL.`,
      false,
      { isModelNotFound: true }
    );
  }

  // 4. Vượt giới hạn Quota hoặc Rate Limit (429) — kiểm tra TRƯỚC 403 vì thông báo 429 của Google thường chứa cụm từ "plan and billing"
  if (
    errCode === 429 ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    const isZeroFreeTierLimit =
      lower.includes("limit: 0") &&
      (lower.includes("free_tier") || lower.includes("freetier"));
    const isDailyQuota =
      isZeroFreeTierLimit ||
      lower.includes("perday") ||
      lower.includes("per_day") ||
      lower.includes("daily");
    const extractedRetry = extractRetryAfterFromMessage(rawMessage);

    if (isZeroFreeTierLimit) {
      return buildResult(
        429,
        "AI_QUOTA_EXCEEDED",
        `Mô hình AI "${targetModel}" hiện có hạn mức Free Tier = 0 trên project hiện tại (yêu cầu bật Paid Billing hoặc chờ cấp quota).`,
        false,
        {
          isDailyQuota: true,
          isZeroFreeTierLimit: true,
          retryAfter: extractedRetry || 60,
        }
      );
    }

    if (isDailyQuota) {
      return buildResult(
        429,
        "AI_QUOTA_EXCEEDED",
        extractedRetry
          ? `${AI_ERROR_MESSAGES_VI.AI_QUOTA_EXCEEDED} (Thử lại sau: ${extractedRetry})`
          : AI_ERROR_MESSAGES_VI.AI_QUOTA_EXCEEDED,
        false,
        { isDailyQuota: true, retryAfter: extractedRetry || 60 }
      );
    }

    return buildResult(
      429,
      "AI_RATE_LIMITED",
      AI_ERROR_MESSAGES_VI.AI_RATE_LIMITED,
      true,
      { isDailyQuota: false, retryAfter: extractedRetry || 15 }
    );
  }

  // 5. Từ chối quyền truy cập (403)
  if (
    errCode === "AI_PERMISSION_DENIED" ||
    errCode === 403 ||
    lower.includes("403") ||
    lower.includes("permission_denied") ||
    lower.includes("permission denied") ||
    lower.includes("forbidden")
  ) {
    return buildResult(
      403,
      "AI_PERMISSION_DENIED",
      `Không có quyền truy cập mô hình AI "${targetModel}" trên project hiện tại. Vui lòng kiểm tra quyền API key hoặc gói Billing.`,
      false
    );
  }

  // 6. Timeout (408 / 504)
  if (
    errCode === "AI_TIMEOUT" ||
    errCode === 408 ||
    errCode === 504 ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("deadline_exceeded") ||
    lower.includes("aborted")
  ) {
    return buildResult(
      504,
      "AI_TIMEOUT",
      AI_ERROR_MESSAGES_VI.AI_TIMEOUT,
      true
    );
  }

  // 7. Request không hợp lệ (400)
  if (
    errCode === 400 ||
    lower.includes("invalid_argument") ||
    lower.includes("bad request")
  ) {
    return buildResult(
      400,
      "AI_INVALID_RESPONSE",
      "Dữ liệu đầu vào gửi tới AI không hợp lệ hoặc vượt quá giới hạn cho phép.",
      false
    );
  }

  // 8. Máy chủ AI quá tải tạm thời (500, 502, 503)
  if (
    errCode === 500 ||
    errCode === 502 ||
    errCode === 503 ||
    lower.includes("503") ||
    lower.includes("500") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable") ||
    lower.includes("internal")
  ) {
    return buildResult(
      503,
      "AI_SERVICE_UNAVAILABLE",
      AI_ERROR_MESSAGES_VI.AI_SERVICE_UNAVAILABLE,
      true,
      { retryAfter: 10 }
    );
  }

  return buildResult(
    500,
    "AI_GENERAL_ERROR",
    AI_ERROR_MESSAGES_VI.AI_GENERAL_ERROR,
    true
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, taskName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(
        `Yêu cầu AI (${taskName}) đã vượt quá thời gian chờ (${Math.round(timeoutMs / 1000)}s).`
      ) as Error & { code?: string; status?: number };
      err.code = "AI_TIMEOUT";
      err.status = 504;
      reject(err);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export interface ExecuteGeminiOptions {
  maxRetries?: number;
  taskName?: string;
  customModel?: string;
  timeoutMs?: number;
  strictModel?: boolean;
  requestId?: string;
}

/**
 * Thực thi hàm gọi Gemini với:
 * - Hỗ trợ cả 2 kiểu gọi:
 *   1. `executeGeminiWithRetry("task-name", async (ai, modelName) => ...)`
 *   2. `executeGeminiWithRetry(async (ai, modelName) => ..., { taskName: "..." })`
 * - Timeout bảo vệ (mặc định 45 giây)
 * - Nếu model không tồn tại (404): Báo lỗi 404 ngay lập tức (không tạo kết quả giả, không che giấu model sai)
 * - Nếu model chạm giới hạn Free Tier limit: 0 hoặc rate-limit tạm thời (429): Tự động chuyển sang model khả dụng trong project (trừ khi strictModel = true)
 * - Ghi log đầy đủ (task, model, status, durationMs) mà không bao giờ ghi API key
 */
export async function executeGeminiWithRetry<T>(
  arg1: string | ((ai: GoogleGenAI, modelName: string) => Promise<T>),
  arg2?:
    | ((ai: GoogleGenAI, modelName: string) => Promise<T>)
    | ExecuteGeminiOptions,
  arg3?: ExecuteGeminiOptions
): Promise<T> {
  let operation: (ai: GoogleGenAI, modelName: string) => Promise<T>;
  let options: ExecuteGeminiOptions = {};

  if (typeof arg1 === "string") {
    operation = arg2 as (ai: GoogleGenAI, modelName: string) => Promise<T>;
    options = { ...(arg3 || {}), taskName: arg1 };
  } else {
    operation = arg1;
    options = (arg2 as ExecuteGeminiOptions) || {};
  }

  const maxRetries = options.maxRetries ?? 2;
  const taskName = options.taskName ?? "Gemini_Task";
  const timeoutMs = options.timeoutMs ?? 45000;
  const reqId = options.requestId || `ai_${Date.now()}`;
  const primaryModel = options.customModel || getConfiguredModelName();

  const status = checkGeminiConfig();
  const ai = getGeminiClient();
  if (!ai || !status.configured) {
    const err = new Error(status.errorMessage || GEMINI_MISSING_KEY_MESSAGE) as Error & {
      code?: string;
      status?: number;
    };
    err.code = status.errorCode || "AI_NOT_CONFIGURED";
    err.status = status.errorCode === "AI_INVALID_API_KEY" ? 401 : 503;
    throw err;
  }

  // Chỉ khi strictModel = true mới giới hạn cứng 1 model; còn lại cho phép fallback khi chạm 429 quota/rate-limit
  // Lưu ý: Nếu primaryModel không tồn tại (404 AI_MODEL_NOT_FOUND), vòng lặp bên dưới sẽ throw ngay lập tức ở lần thử đầu tiên.
  const baseCandidates = Array.from(new Set([primaryModel, ...FALLBACK_GEMINI_MODELS]));
  const rawCandidates = options.strictModel ? [primaryModel] : baseCandidates;

  // Sắp xếp ưu tiên các model không nằm trong danh sách bị khóa Free Tier limit: 0 (cache 10 phút)
  // hoặc vừa chạm rate-limit RPM trong 45 giây qua (nhưng luôn giữ primaryModel ở đầu nếu chưa bị cache)
  const now = Date.now();
  const nonZeroCandidates = rawCandidates.filter((m) => {
    const blockedAt = freeTierZeroLimitCache.get(m);
    if (blockedAt && now - blockedAt < 10 * 60 * 1000) {
      return false;
    }
    return true;
  });

  const pool = nonZeroCandidates.length > 0 ? nonZeroCandidates : rawCandidates;
  const freshModels = pool.filter((m) => {
    const rlAt = rateLimitedModelCache.get(m);
    return !(rlAt && now - rlAt < 45 * 1000);
  });
  const cooledModels = pool.filter((m) => {
    const rlAt = rateLimitedModelCache.get(m);
    return Boolean(rlAt && now - rlAt < 45 * 1000);
  });

  const candidateModels = options.strictModel
    ? [primaryModel]
    : [...freshModels, ...cooledModels];

  let lastError: any = null;
  let primaryQuotaError: any = null;

  for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
    const currentModel = candidateModels[modelIdx];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const callStart = Date.now();
      try {
        console.log(
          `[GEMINI_CALL] [${reqId}] task="${taskName}" model="${currentModel}" attempt=${attempt + 1}/${maxRetries + 1}`
        );

        const result = await withTimeout(
          operation(ai, currentModel),
          timeoutMs,
          taskName
        );

        const durationMs = Date.now() - callStart;
        lastWorkingModel = currentModel;
        rateLimitedModelCache.delete(currentModel);
        console.log(
          `[GEMINI_SUCCESS] [${reqId}] task="${taskName}" model="${currentModel}" status=200 durationMs=${durationMs}`
        );

        return result;
      } catch (err: any) {
        const durationMs = Date.now() - callStart;
        if (err && typeof err === "object") {
          err.modelName = currentModel;
        }
        lastError = err;
        const parsed = parseGeminiError(err, currentModel);

        console.warn(
          `[GEMINI_ERROR] [${reqId}] task="${taskName}" model="${currentModel}" httpStatus=${parsed.httpStatus} code="${parsed.errorCode}" durationMs=${durationMs}`
        );

        // Nếu primaryModel không tồn tại (404) -> báo lỗi ngay lập tức, tuyệt đối không fallback che giấu lỗi model
        if (parsed.isModelNotFound || parsed.errorCode === "AI_MODEL_NOT_FOUND") {
          if (currentModel === primaryModel || options.strictModel) {
            throw err;
          }
          // Nếu một fallback model phụ không khả dụng trên vùng hiện tại, chuyển sang fallback tiếp theo
          break;
        }

        // Nếu model bị khóa limit: 0 trên Free Tier -> lưu vào cache 10 phút và chuyển sang model khả dụng tiếp theo
        if (parsed.isZeroFreeTierLimit) {
          freeTierZeroLimitCache.set(currentModel, Date.now());
        }

        if (
          parsed.errorCode === "AI_QUOTA_EXCEEDED" ||
          parsed.errorCode === "AI_RATE_LIMITED"
        ) {
          rateLimitedModelCache.set(currentModel, Date.now());
          if (!primaryQuotaError) {
            primaryQuotaError = err;
          }
          if (modelIdx < candidateModels.length - 1) {
            console.warn(
              `[AI_Engine] [${reqId}] Model "${currentModel}" chạm giới hạn (${parsed.errorCode}) cho [${taskName}]. Chuyển sang model khả dụng "${candidateModels[modelIdx + 1]}"...`
            );
            break;
          }
        }

        if (!parsed.retryable || attempt === maxRetries) {
          throw primaryQuotaError || err;
        }

        const delayMs = 1500 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
        console.warn(
          `[AI_Engine] [${reqId}] [${taskName}] Lỗi tạm thời (${parsed.errorCode}), thử lại sau ${delayMs}ms (Lần ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw primaryQuotaError || lastError;
}

/**
 * Làm sạch chuỗi JSON trả về từ Gemini (loại bỏ ```json ... ``` hoặc văn bản thừa ngoài cặp ngoặc)
 * và kiểm tra JSON.parse an toàn. Ném lỗi `AI_EMPTY_RESPONSE` hoặc `AI_INVALID_RESPONSE` rõ ràng.
 */
export function cleanAndParseGeminiJson<T = any>(
  rawText: string | undefined | null,
  taskName = "JSON_Parse"
): T {
  if (!rawText || !rawText.trim()) {
    const err = new Error(
      `AI trả về phản hồi rỗng khi thực hiện tác vụ ${taskName}.`
    ) as Error & { code?: string };
    err.code = "AI_EMPTY_RESPONSE";
    throw err;
  }

  let cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Nếu vẫn còn markdown code block bên trong
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");

  let startIdx = -1;
  let isArray = false;

  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    startIdx = firstObj;
    isArray = false;
  } else if (firstArr !== -1) {
    startIdx = firstArr;
    isArray = true;
  }

  if (startIdx !== -1) {
    const endIdx = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
    if (endIdx !== -1 && endIdx >= startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr: any) {
    console.error(
      `[AI_Engine] [${taskName}] JSON Parse Error:`,
      parseErr?.message,
      "Raw snippet:",
      rawText.slice(0, 300)
    );
    const err = new Error(
      `Dữ liệu AI trả về cho ${taskName} không đúng định dạng JSON chuẩn.`
    ) as Error & { code?: string };
    err.code = "AI_INVALID_RESPONSE";
    throw err;
  }
}

/**
 * Cắt ngắn văn bản đầu vào một cách an toàn để tránh vượt giới hạn token.
 */
export function truncateAiInputText(text: string, maxChars = 24000): string {
  const trimmed = (text || "").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return (
    trimmed.slice(0, maxChars) +
    "\n\n[...Nội dung đã được rút gọn tự động để tối ưu hóa xử lý AI...]"
  );
}

// ============================================================================
// CÁC HÀM TIỆN ÍCH GỌI GEMINI TRỰC TIẾP
// ============================================================================

export async function generateSummary(text: string, language = "vi") {
  const safeText = truncateAiInputText(text, 20000);
  if (!safeText) {
    const err = new Error("Nội dung cần tóm tắt không được để trống.") as Error & { code?: string };
    err.code = "AI_INPUT_EMPTY";
    throw err;
  }

  return executeGeminiWithRetry(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `You are an academic assistant. Summarize the following content clearly in ${
          language === "vi" ? "Vietnamese" : "English"
        }. Provide a 2-3 sentence overview and 4-6 key bullet points.\n\nContent:\n${safeText}`,
      });
      const output = response.text?.trim() || "";
      if (!output) {
        const err = new Error("AI returned empty summary.") as Error & { code?: string };
        err.code = "AI_EMPTY_RESPONSE";
        throw err;
      }
      return output;
    },
    { taskName: "Generate_Summary" }
  );
}

export async function generateFlashcards(text: string, language = "vi") {
  const safeText = truncateAiInputText(text, 18000);
  if (!safeText) {
    const err = new Error("Nội dung tạo flashcard không được để trống.") as Error & { code?: string };
    err.code = "AI_INPUT_EMPTY";
    throw err;
  }

  return executeGeminiWithRetry(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Create 5 study flashcards in ${
          language === "vi" ? "Vietnamese" : "English"
        } from the following content. Return ONLY a valid JSON array of objects with "front" and "back" keys.\n\nContent:\n${safeText}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      return cleanAndParseGeminiJson<Array<{ front: string; back: string }>>(
        response.text,
        "Generate_Flashcards"
      );
    },
    { taskName: "Generate_Flashcards" }
  );
}

export async function generateQuiz(text: string, language = "vi") {
  const safeText = truncateAiInputText(text, 18000);
  if (!safeText) {
    const err = new Error("Nội dung tạo câu hỏi trắc nghiệm không được để trống.") as Error & {
      code?: string;
    };
    err.code = "AI_INPUT_EMPTY";
    throw err;
  }

  return executeGeminiWithRetry(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Create 4 multiple-choice questions in ${
          language === "vi" ? "Vietnamese" : "English"
        } from the following content. Return ONLY a valid JSON array of objects with "question", "options" (4 strings), "correctAnswerIndex" (0-3), and "explanation".\n\nContent:\n${safeText}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      return cleanAndParseGeminiJson<
        Array<{
          question: string;
          options: string[];
          correctAnswerIndex: number;
          explanation: string;
        }>
      >(response.text, "Generate_Quiz");
    },
    { taskName: "Generate_Quiz" }
  );
}

export async function chatWithNotes(
  question: string,
  context: string,
  language = "vi"
) {
  const cleanQuestion = (question || "").trim();
  if (!cleanQuestion) {
    const err = new Error("Câu hỏi không được để trống.") as Error & { code?: string };
    err.code = "AI_INPUT_EMPTY";
    throw err;
  }

  const safeContext = truncateAiInputText(context || "", 20000);

  return executeGeminiWithRetry(
    async (ai, modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `You are StudySync AI Tutor. Answer the student's question in ${
          language === "vi" ? "Vietnamese" : "English"
        } based on the provided study context.\n\nStudy Context:\n${safeContext}\n\nQuestion: ${cleanQuestion}`,
      });
      const answer = response.text?.trim() || "";
      if (!answer) {
        const err = new Error("AI không trả về câu trả lời.") as Error & { code?: string };
        err.code = "AI_EMPTY_RESPONSE";
        throw err;
      }
      return answer;
    },
    { taskName: "Chat_With_Notes" }
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  uploadAudioFile,
  transcribeAudio,
  analyzeAudio,
  analyzeStoredAudio,
  getAuthHeaders,
} from '../../services/api';
import {
  formatDuration,
  formatFileSize,
  getSupportedAudioMimeType,
  cleanAiResponse,
} from '../../utils/formatters';
import { AudioPlayer } from '../common/AudioPlayer';
import {
  Mic,
  Play,
  Pause,
  Square,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileAudio,
  Sparkles,
  RefreshCw,
  Terminal,
  Activity,
  HardDrive,
  Cpu,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Radio,
  FileCheck,
  Layers,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface LogItem {
  id: string;
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: string;
  data: Record<string, any>;
  message: string;
}

export const AudioDebugger: React.FC = () => {
  const {
    subjects,
    lessons,
    addLesson,
    addFlashcards,
    addQuiz,
    addDeadline,
    setActiveSubjectId,
    setActiveLessonId,
    setActiveTab,
    showToast,
    language,
  } = useApp();
  const isEn = language === 'en';

  // Test states for BƯỚC 14 checklist
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceLabel, setActiveDeviceLabel] = useState<string>('');
  const [supportedMimeTypes, setSupportedMimeTypes] = useState<string[]>([]);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);

  // Recorder states
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');

  // Storage and AI steps
  const [targetSubjectId, setTargetSubjectId] = useState<string>(subjects[0]?.id || '');
  const [lessonTitle, setLessonTitle] = useState<string>(
    isEn ? 'AI Audio Diagnostic Lesson' : 'Bài học kiểm tra âm thanh AI'
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [storageResult, setStorageResult] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptResult, setTranscriptResult] = useState<any>(null);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);

  // Non-sensitive Debug Logs
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Helper to append safe log without any keys/tokens
  const addLog = (
    level: 'info' | 'success' | 'warn' | 'error',
    category: string,
    message: string,
    data: Record<string, any> = {}
  ) => {
    // Sanitize data: ensure no keys, passwords, or tokens are ever logged
    const safeData: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase();
      if (lower.includes('key') || lower.includes('token') || lower.includes('pass') || lower.includes('secret')) {
        continue;
      }
      safeData[k] = v;
    }

    const item: LogItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      level,
      category,
      message,
      data: safeData,
    };

    setLogs((prev) => [item, ...prev].slice(0, 100));
    console.log(`[SafeAudioDebug][${category}] ${message}`, safeData);
  };

  // Inspect environment on mount
  useEffect(() => {
    checkEnvironmentSupport();

    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Step 1 & 2: Kiểm tra Microphone & Browser Support
  const checkEnvironmentSupport = async () => {
    const candidateMimes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    const supported: string[] = [];
    if (typeof MediaRecorder !== 'undefined') {
      candidateMimes.forEach((m) => {
        if (MediaRecorder.isTypeSupported(m)) supported.push(m);
      });
    }
    setSupportedMimeTypes(supported);

    // Check mediaDevices
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const isHttpsOrLocal = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    addLog(
      'info',
      'ENVIRONMENT_CHECK',
      isEn ? 'Checking browser audio environment' : 'Kiểm tra môi trường trình duyệt',
      {
        hasMediaDevices,
        isHttpsOrLocal,
        supportedMimeTypes: supported,
        userAgent: navigator.userAgent.slice(0, 60),
      }
    );

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as any });
        setMicPermission(perm.state);
        perm.onchange = () => setMicPermission(perm.state);
      } catch {
        setMicPermission('unknown');
      }
    }
  };

  // Step 3: Bấm kiểm tra microphone & cấp quyền
  const requestMicCheck = async () => {
    setIsMicTesting(true);
    addLog(
      'info',
      'MIC_REQUEST',
      isEn ? 'Requesting microphone permission and testing input' : 'Bắt đầu kiểm tra và yêu cầu quyền microphone'
    );

    try {
      cleanupAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMicPermission('granted');

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      setDeviceList(audioInputs);

      const activeTrack = stream.getAudioTracks()[0];
      const trackLabel = activeTrack?.label || (isEn ? 'Default Microphone' : 'Microphone mặc định');
      setActiveDeviceLabel(trackLabel);

      addLog(
        'success',
        'MIC_CHECK_SUCCESS',
        isEn ? 'Microphone permission granted and connected' : 'Đã cấp quyền và kết nối microphone thành công',
        {
          deviceLabel: trackLabel,
          channelCount: activeTrack?.getSettings()?.channelCount || 1,
          sampleRate: activeTrack?.getSettings()?.sampleRate || 44100,
          totalInputsFound: audioInputs.length,
        }
      );

      // Setup Web Audio Volume Meter
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(pcmData);
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i];
        }
        const avg = sum / pcmData.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      showToast(
        isEn ? `Microphone ready: ${trackLabel}` : `Microphone đã sẵn sàng: ${trackLabel}`,
        'success'
      );
    } catch (err: any) {
      console.error('Mic check error:', err);
      setMicPermission('denied');
      addLog(
        'error',
        'MIC_PERMISSION_DENIED',
        isEn ? 'Microphone permission denied or no device found' : 'Không thể cấp quyền hoặc không tìm thấy microphone',
        {
          errorCode: err?.name || 'UNKNOWN',
          errorMessage: err?.message,
        }
      );
      showToast(
        (isEn ? 'Microphone access error: ' : 'Lỗi truy cập microphone: ') + err?.message,
        'error'
      );
    } finally {
      setIsMicTesting(false);
    }
  };

  // Step 4, 5, 6: Bắt đầu ghi âm & Nói thử 10 giây
  const startRecording = async (targetDurationSeconds: number = 0) => {
    try {
      if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
        await requestMicCheck();
      }

      if (!mediaStreamRef.current) {
        showToast(
          isEn ? 'No active microphone stream.' : 'Chưa có luồng microphone hoạt động.',
          'error'
        );
        return;
      }

      audioChunksRef.current = [];
      const bestMime = getSupportedAudioMimeType() || 'audio/webm';
      setAudioMimeType(bestMime);

      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: bestMime,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          addLog(
            'info',
            'CHUNK_RECEIVED',
            isEn ? `Received audio chunk (${event.data.size} bytes)` : `Nhận audio chunk (${event.data.size} bytes)`,
            {
              chunkSize: event.data.size,
              chunksAccumulated: audioChunksRef.current.length,
              mimeType: event.data.type,
            }
          );
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || bestMime || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMime });

        addLog(
          'success',
          'RECORDING_STOPPED',
          isEn ? 'Recording completed' : 'Hoàn tất ghi âm',
          {
            recorderState: recorder.state,
            blobSize: blob.size,
            chunksCount: audioChunksRef.current.length,
            mimeType: finalMime,
          }
        );

        if (blob.size === 0) {
          addLog(
            'error',
            'ZERO_BYTE_AUDIO',
            isEn ? 'Warning: Audio blob is empty (0 bytes)!' : 'Cảnh báo: Blob âm thanh rỗng (0 bytes)!',
            {
              chunksCount: audioChunksRef.current.length,
            }
          );
          showToast(
            isEn
              ? 'Error: Audio file size is 0 bytes. Please check your microphone and speak louder.'
              : 'Lỗi: File âm thanh có kích thước 0 bytes. Vui lòng kiểm tra mic và nói to hơn.',
            'error'
          );
          return;
        }

        const ext = finalMime.includes('mp4') ? 'mp4' : finalMime.includes('wav') ? 'wav' : 'webm';
        const testFile = new File([blob], `debug-audio-${Date.now()}.${ext}`, { type: finalMime });
        const objUrl = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioFile(testFile);
        setAudioUrl(objUrl);
        setDownloadUrl(objUrl);
        setRecorderState('stopped');

        showToast(
          isEn
            ? `Recorded successfully: ${formatFileSize(blob.size)} (${blob.size} bytes)`
            : `Đã ghi âm thành công: ${formatFileSize(blob.size)} (${blob.size} bytes)`,
          'success'
        );
      };

      recorder.start(1000); // 1-second chunks
      setRecorderState('recording');
      setRecordingDuration(0);

      addLog(
        'info',
        'RECORDING_START',
        isEn ? 'Recording started' : 'Bắt đầu ghi âm',
        {
          recorderState: recorder.state,
          mimeType: bestMime,
          autoStopInSeconds: targetDurationSeconds || 'Manual',
        }
      );

      if (timerRef.current) clearInterval(timerRef.current);
      let sec = 0;
      timerRef.current = setInterval(() => {
        sec++;
        setRecordingDuration(sec);
        if (targetDurationSeconds > 0 && sec >= targetDurationSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error('startRecording error:', err);
      addLog(
        'error',
        'RECORDER_ERROR',
        isEn ? 'Error starting MediaRecorder' : 'Lỗi khi khởi động MediaRecorder',
        {
          errorCode: err?.name,
          errorMessage: err?.message,
        }
      );
      showToast(
        (isEn ? 'Failed to start recording: ' : 'Lỗi bắt đầu ghi âm: ') + err?.message,
        'error'
      );
    }
  };

  // Step 7: Bấm dừng
  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      } catch (e) {
        console.warn('requestData error:', e);
      }
      mediaRecorderRef.current.stop();
      setRecorderState('stopped');
    }
  };

  // Step 12 & 13: Tạo bài học mới & Upload file audio lên Storage
  const handleUploadToStorage = async () => {
    if (!audioBlob) {
      showToast(
        isEn ? 'No recorded audio file to upload.' : 'Chưa có file âm thanh ghi âm để tải lên.',
        'error'
      );
      return;
    }

    setIsUploading(true);
    addLog(
      'info',
      'UPLOAD_START',
      isEn
        ? 'Sending multipart/form-data request to /api/upload/audio'
        : 'Bắt đầu gửi request multipart/form-data lên /api/upload/audio',
      {
        fileName: audioFile?.name || 'test.webm',
        blobSize: audioBlob.size,
        mimeType: audioMimeType,
        subjectId: targetSubjectId,
      }
    );

    try {
      const res = await uploadAudioFile({
        audioBlob,
        mimeType: audioMimeType,
        fileName: audioFile?.name || `test-${Date.now()}.webm`,
        duration: recordingDuration || 10,
        subjectId: targetSubjectId,
      });

      setStorageResult(res);
      addLog(
        'success',
        'UPLOAD_SUCCESS',
        isEn ? 'Audio file uploaded to server successfully' : 'Upload file âm thanh lên server thành công',
        {
          apiStatus: 200,
          fileId: res.fileId,
          audioUrl: res.audioUrl,
          storagePath: res.storagePath,
          fileSize: res.fileSize,
          mimeType: res.mimeType,
        }
      );
      showToast(
        isEn ? 'Audio file saved on server!' : 'File âm thanh đã được lưu trên máy chủ!',
        'success'
      );
    } catch (err: any) {
      addLog(
        'error',
        'UPLOAD_FAILED',
        isEn ? 'Error uploading audio file to server' : 'Lỗi khi upload file âm thanh lên server',
        {
          errorCode: err?.errorCode || 'UPLOAD_ERROR',
          errorMessage: err?.message,
        }
      );
      showToast(
        (isEn ? 'File upload failed: ' : 'Lỗi upload file: ') + err?.message,
        'error'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Step 15 & 16 & 17: Gọi API /api/ai/transcribe & nhận diện Gemini
  const handleCallAiTranscribe = async () => {
    if (!audioBlob && !storageResult?.fileId) {
      showToast(
        isEn ? 'No audio file or fileId available to transcribe.' : 'Chưa có file âm thanh hoặc fileId để nhận diện.',
        'error'
      );
      return;
    }

    setIsTranscribing(true);
    addLog(
      'info',
      'TRANSCRIBE_REQUEST',
      isEn
        ? 'Sending speech recognition request to /api/ai/transcribe'
        : 'Gửi request nhận diện giọng nói đến /api/ai/transcribe',
      {
        hasBlob: !!audioBlob,
        blobSize: audioBlob?.size,
        mimeType: audioMimeType,
        fileId: storageResult?.fileId,
      }
    );

    try {
      const res = await transcribeAudio({
        audioBlob: audioBlob || undefined,
        fileId: storageResult?.fileId,
        mimeType: audioMimeType,
        subjectId: targetSubjectId,
      });

      setTranscriptResult(res);
      addLog(
        'success',
        'TRANSCRIBE_SUCCESS',
        isEn ? 'Gemini returned transcript successfully' : 'Gemini trả về transcript thành công',
        {
          apiStatus: 200,
          transcriptLength: res.transcript?.length || 0,
          language: res.language || 'vi',
          warningsCount: res.warnings?.length || 0,
          isRealAi: res.isRealAi,
        }
      );
      showToast(
        isEn ? 'AI transcribed audio successfully!' : 'AI đã nhận diện văn bản thành công!',
        'success'
      );
    } catch (err: any) {
      addLog(
        'error',
        'TRANSCRIBE_FAILED',
        isEn ? 'Gemini transcription failed' : 'Gemini phiên âm thất bại',
        {
          errorCode: (err as any)?.errorCode || 'TRANSCRIPTION_FAILED',
          errorMessage: err?.message,
          warnings: (err as any)?.warnings,
        }
      );
      showToast(
        (isEn ? 'Transcription failed: ' : 'Phiên âm thất bại: ') + err?.message,
        'error'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Step 19 & 20: Lưu transcript vào database & hiển thị
  const handleSaveLessonWithTranscript = () => {
    if (!transcriptResult?.transcript) {
      showToast(
        isEn ? 'No transcript available to save to lesson.' : 'Chưa có transcript để lưu vào bài học.',
        'error'
      );
      return;
    }

    const clean = cleanAiResponse(transcriptResult.transcript);
    const newLessonId = `les_debug_${Date.now()}`;

    addLesson({
      id: newLessonId,
      ownerId: 'usr_demo_101',
      subjectId: targetSubjectId,
      title:
        lessonTitle.trim() ||
        (isEn
          ? `Audio Diagnostic Lesson ${new Date().toLocaleDateString('en-US')}`
          : `Bài kiểm tra âm thanh ${new Date().toLocaleDateString('vi-VN')}`),
      lessonDate: new Date().toISOString().split('T')[0],
      audioUrl: storageResult?.audioUrl || undefined,
      audioDuration: recordingDuration || 10,
      audioSize: audioBlob?.size || 0,
      audioMimeType,
      audioFileId: storageResult?.fileId,
      transcript: clean,
      summary: isEn
        ? `Automated summary from diagnostic audio recording. Length: ${clean.length} characters.`
        : `Bản tóm tắt tự động từ file ghi âm kiểm tra debug âm thanh. Độ dài: ${clean.length} ký tự.`,
      keyPoints: [
        {
          title: isEn ? 'Microphone Test Result' : 'Kết quả kiểm tra Microphone',
          content: isEn
            ? `Recording captured and processed via Gemini. File size: ${formatFileSize(audioBlob?.size || 0)}.`
            : `Bản ghi âm đã được thu và gửi qua Gemini. Kích thước file: ${formatFileSize(audioBlob?.size || 0)}.`,
          importance: 'high',
        },
      ],
      keywords: ['Debug', 'Microphone', 'Gemini Transcribe', 'Storage'],
      concepts: [],
      analysisStatus: 'completed',
      sourceType: 'audio',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setSavedLessonId(newLessonId);
    addLog(
      'success',
      'LESSON_SAVED',
      isEn ? 'Saved lesson and transcript to database' : 'Đã lưu bài học kèm transcript vào cơ sở dữ liệu',
      {
        lessonId: newLessonId,
        subjectId: targetSubjectId,
        hasAudioUrl: !!(storageResult?.audioUrl || audioUrl),
      }
    );
    showToast(
      isEn ? 'Lesson saved successfully! You can view it now.' : 'Đã lưu bài học thành công! Bạn có thể xem ngay.',
      'success'
    );
  };

  // Step 6: Kiểm tra file thật trong Storage
  const [verifiedStorageDetails, setVerifiedStorageDetails] = useState<any>(null);
  const handleVerifyStorageFile = async () => {
    if (!storageResult?.audioUrl) {
      showToast(
        isEn ? 'Please upload the file to Storage first.' : 'Vui lòng upload file lên Storage trước.',
        'error'
      );
      return;
    }
    try {
      addLog(
        'info',
        'STORAGE_VERIFY_REQUEST',
        isEn
          ? 'Verifying physical file on server via Storage URL'
          : 'Gửi request kiểm tra file thật trên server qua Storage URL',
        {
          audioUrl: storageResult.audioUrl,
        }
      );
      const res = await fetch(storageResult.audioUrl, { method: 'HEAD' });
      const contentLength = res.headers.get('content-length');
      const contentType = res.headers.get('content-type');
      const acceptRanges = res.headers.get('accept-ranges');
      const ok = res.status === 200 || res.status === 206;
      setVerifiedStorageDetails({
        status: res.status,
        contentLength,
        contentType,
        acceptRanges,
        ok,
      });
      addLog(
        ok ? 'success' : 'error',
        'STORAGE_VERIFIED',
        isEn
          ? `Server physical file check: HTTP ${res.status}`
          : `Kiểm tra file thật trên server: HTTP ${res.status}`,
        {
          status: res.status,
          contentLength: Number(contentLength),
          contentType,
          acceptRanges,
          fileAccessible: ok,
        }
      );
      if (ok) {
        showToast(
          isEn
            ? `Physical file verified on Storage! HTTP ${res.status} (${contentLength} bytes)`
            : `File thật đã sẵn sàng trên Storage! HTTP ${res.status} (${contentLength} bytes)`,
          'success'
        );
      } else {
        showToast(
          isEn
            ? `Cannot read file on Storage: HTTP ${res.status}`
            : `Không thể đọc file trên Storage: HTTP ${res.status}`,
          'error'
        );
      }
    } catch (e: any) {
      addLog(
        'error',
        'STORAGE_VERIFY_FAILED',
        isEn ? 'Cannot connect to Storage URL' : 'Không thể kết nối đến Storage URL',
        { error: e.message }
      );
      showToast(
        (isEn ? 'Storage file verification error: ' : 'Lỗi kiểm tra Storage file: ') + e.message,
        'error'
      );
    }
  };

  // Step 10-16: Phân tích toàn diện AI với real file qua FormData
  const [fullAiResult, setFullAiResult] = useState<any>(null);
  const [isFullAiAnalyzing, setIsFullAiAnalyzing] = useState<boolean>(false);
  const handleAnalyzeWithFullAi = async () => {
    if (!audioBlob && !audioFile) {
      showToast(
        isEn ? 'No audio file available to analyze.' : 'Chưa có file âm thanh để phân tích.',
        'error'
      );
      return;
    }
    setIsFullAiAnalyzing(true);
    addLog(
      'info',
      'FULL_AI_REQUEST',
      isEn
        ? 'Sending FormData with physical audio file to /api/ai/analyze-audio'
        : 'Gửi FormData với field audio thật lên /api/ai/analyze-audio',
      {
        fileName: audioFile?.name || 'test.webm',
        fileSize: audioFile?.size || audioBlob?.size,
        mimeType: audioMimeType,
        subjectId: targetSubjectId,
        hasRealFile: !!audioFile || !!audioBlob,
      }
    );
    try {
      const realFile = audioFile || (audioBlob ? new File([audioBlob], `debug-${Date.now()}.webm`, { type: audioMimeType }) : null);
      const res = await analyzeAudio({
        audioFile: realFile,
        subjectId: targetSubjectId,
        lessonTitle,
        duration: recordingDuration || 10,
      });
      setFullAiResult(res);
      addLog(
        'success',
        'FULL_AI_SUCCESS',
        isEn ? 'Gemini completed full audio analysis' : 'Gemini hoàn tất phân tích toàn diện',
        {
          transcriptLength: res.transcript?.length,
          summaryLength: res.summary?.length,
          flashcardsCount: res.flashcards?.length,
          quizzesCount: res.quizQuestions?.length,
          exercisesCount: res.exercises?.length,
          deadlinesCount: res.deadlines?.length,
          isRealAi: res.isRealAi,
        }
      );

      // Save complete lesson to AppContext
      const fullLessonId = `les_ai_${Date.now()}`;
      addLesson({
        id: fullLessonId,
        ownerId: 'usr_demo_101',
        subjectId: targetSubjectId,
        title:
          lessonTitle.trim() ||
          (isEn
            ? `Full AI Lesson ${new Date().toLocaleDateString('en-US')}`
            : `Bài học AI toàn diện ${new Date().toLocaleDateString('vi-VN')}`),
        lessonDate: new Date().toISOString().split('T')[0],
        audioUrl: res.audioUrl || storageResult?.audioUrl || undefined,
        storagePath: res.storagePath,
        audioDuration: recordingDuration || 10,
        audioSize: audioBlob?.size || 0,
        audioMimeType,
        audioFileId: res.lessonId,
        transcript: cleanAiResponse(res.transcript),
        summary: cleanAiResponse(res.summary),
        keyPoints: res.keyPoints,
        keywords: res.keywords,
        exercises: res.exercises,
        transcriptionStatus: 'completed',
        summaryStatus: 'completed',
        analysisStatus: 'completed',
        sourceType: 'audio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (res.flashcards && res.flashcards.length > 0) {
        addFlashcards(
          res.flashcards.map((fc: any, i: number) => ({
            id: `fc_dbg_${Date.now()}_${i}`,
            ownerId: 'usr_demo_101',
            subjectId: targetSubjectId,
            lessonId: fullLessonId,
            front: cleanAiResponse(fc.front),
            back: cleanAiResponse(fc.back),
            difficulty: (fc.difficulty as any) || 'medium',
            topic: 'Debug AI',
            reviewStatus: 'new' as const,
            correctCount: 0,
            incorrectCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      if (res.quizQuestions && res.quizQuestions.length > 0) {
        addQuiz({
          id: `quiz_dbg_${Date.now()}`,
          ownerId: 'usr_demo_101',
          subjectId: targetSubjectId,
          lessonId: fullLessonId,
          title: isEn ? `Quiz: ${lessonTitle}` : `Trắc nghiệm: ${lessonTitle}`,
          questions: res.quizQuestions.map((q: any) => ({
            ...q,
            question: cleanAiResponse(q.question),
            explanation: cleanAiResponse(q.explanation),
            options: (q.options || []).map((o: any) => cleanAiResponse(o)),
            difficulty: 'medium' as const,
          })),
          difficulty: 'medium',
          createdAt: new Date().toISOString(),
        });
      }

      if (res.deadlines && res.deadlines.length > 0) {
        res.deadlines.forEach((dl: any) => {
          addDeadline({
            subjectId: targetSubjectId,
            title: cleanAiResponse(dl.title),
            dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            dueTime: '23:59',
            priority: (dl.priority as any) || 'medium',
            status: 'todo',
            type: 'assignment',
            sourceType: 'ai_transcript',
            sourceId: fullLessonId,
            sourceText: dl.title,
            aiConfidence: 0.9,
            isAiSuggested: false,
          });
        });
      }

      setSavedLessonId(fullLessonId);
      showToast(
        isEn
          ? 'Full AI analysis succeeded and generated summary, flashcards, quiz, and exercises!'
          : 'Phân tích toàn diện AI thành công và đã tạo đủ tóm tắt, flashcard, quiz, bài tập!',
        'success'
      );
    } catch (err: any) {
      addLog(
        'error',
        'FULL_AI_FAILED',
        isEn ? 'AI analysis failed' : 'Lỗi phân tích AI',
        {
          errorCode: err?.errorCode,
          errorMessage: err?.message,
          isQuota: err?.errorCode === 'AI_QUOTA_EXCEEDED' || err?.isDailyQuota,
          fileSaved: err?.fileSaved,
          audioUrl: err?.audioUrl,
        }
      );
      showToast(
        (isEn ? 'Analysis failed: ' : 'Phân tích thất bại: ') + err?.message,
        'error'
      );
    } finally {
      setIsFullAiAnalyzing(false);
    }
  };

  // Step 19: Thử phân tích lại file đã lưu trong Storage
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const handleReanalyzeFromStorage = async () => {
    const targetLesson = savedLessonId ? savedLessonId : (storageResult?.lessonId || lessons[0]?.id);
    if (!targetLesson) {
      showToast(
        isEn ? 'No stored lesson available to re-analyze.' : 'Chưa có bài học trong storage để phân tích lại.',
        'error'
      );
      return;
    }
    setIsReanalyzing(true);
    addLog(
      'info',
      'REANALYZE_STORED_REQUEST',
      isEn
        ? 'Sending /api/ai/analyze-stored-audio request with stored lessonId'
        : 'Gửi request /api/ai/analyze-stored-audio với lessonId từ storage',
      {
        lessonId: targetLesson,
      }
    );
    try {
      const res = await analyzeStoredAudio({ lessonId: targetLesson });
      addLog(
        'success',
        'REANALYZE_STORED_SUCCESS',
        isEn ? 'AI re-analyzed stored file successfully' : 'AI đã phân tích lại file từ Storage thành công',
        {
          lessonId: res.lessonId,
          transcriptLength: res.transcript?.length,
          summaryLength: res.summary?.length,
        }
      );
      showToast(
        isEn ? 'Re-analyzed from Storage successfully!' : 'Phân tích lại từ Storage thành công!',
        'success'
      );
    } catch (e: any) {
      addLog(
        'error',
        'REANALYZE_STORED_FAILED',
        (isEn ? 'Error re-analyzing from storage: ' : 'Lỗi phân tích lại từ storage: ') + e.message,
        {
          errorCode: e?.errorCode,
        }
      );
      showToast(
        (isEn ? 'Re-analysis from storage failed: ' : 'Phân tích lại từ storage thất bại: ') + e.message,
        'error'
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Step 20: Thử file rỗng (0 bytes) và file không hợp lệ
  const handleTestEmptyFile = async () => {
    addLog(
      'info',
      'EDGE_TEST_EMPTY',
      isEn
        ? 'Sending 0-byte empty file to /api/ai/analyze-audio to test protection'
        : 'Thử gửi file rỗng 0 bytes lên /api/ai/analyze-audio để kiểm tra bảo vệ'
    );
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    const emptyFile = new File([emptyBlob], 'empty.webm', { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', emptyFile);
    try {
      const res = await fetch('/api/ai/analyze-audio', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(
          'success',
          'EMPTY_FILE_REJECTED',
          isEn
            ? `Backend properly rejected 0-byte file (HTTP ${res.status})`
            : `Backend đã chặn file 0 bytes chuẩn xác (HTTP ${res.status})`,
          {
            errorCode: data?.errorCode,
            message: data?.message,
          }
        );
        showToast(
          isEn
            ? `Empty file protection works: ${data?.message}`
            : `Bảo vệ file rỗng hoạt động tốt: ${data?.message}`,
          'success'
        );
      } else {
        addLog(
          'warn',
          'EMPTY_FILE_ACCEPTED',
          isEn ? 'Warning: Backend accepted 0-byte file!' : 'Cảnh báo: Backend đã chấp nhận file 0 bytes!',
          data
        );
      }
    } catch (e: any) {
      addLog(
        'error',
        'TEST_FAILED',
        (isEn ? 'Error calling test API: ' : 'Lỗi khi gọi API kiểm tra: ') + e.message
      );
    }
  };

  const handleTestInvalidFormat = async () => {
    addLog(
      'info',
      'EDGE_TEST_INVALID_FORMAT',
      isEn
        ? 'Sending fake text file (.txt / text/plain) as audio'
        : 'Thử gửi file text giả định dạng âm thanh (.txt / text/plain)'
    );
    const fakeBlob = new Blob(['This is not an audio file'], { type: 'text/plain' });
    const fakeFile = new File([fakeBlob], 'not-audio.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('audio', fakeFile);
    try {
      const res = await fetch('/api/ai/analyze-audio', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(
          'success',
          'INVALID_FORMAT_REJECTED',
          isEn
            ? `Backend properly rejected invalid format (HTTP ${res.status})`
            : `Backend đã chặn định dạng không hợp lệ (HTTP ${res.status})`,
          {
            errorCode: data?.errorCode,
            message: data?.message,
          }
        );
        showToast(
          isEn
            ? `Format protection works: ${data?.message}`
            : `Bảo vệ định dạng hoạt động tốt: ${data?.message}`,
          'success'
        );
      } else {
        addLog(
          'warn',
          'INVALID_FORMAT_ACCEPTED',
          isEn ? 'Warning: Backend accepted invalid format!' : 'Cảnh báo: Backend chấp nhận định dạng không hợp lệ!',
          data
        );
      }
    } catch (e: any) {
      addLog(
        'error',
        'TEST_FAILED',
        (isEn ? 'Error calling test API: ' : 'Lỗi khi gọi API kiểm tra: ') + e.message
      );
    }
  };

  const handleTestBlobUrlOnly = async () => {
    addLog(
      'info',
      'EDGE_TEST_BLOB_URL',
      isEn
        ? 'Sending body with only audioUrl=blob:http://... without physical file or lessonId'
        : 'Thử gửi body chỉ có audioUrl=blob:http://... mà không có file thật hoặc lessonId'
    );
    try {
      const res = await fetch('/api/ai/analyze-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          audioUrl: 'blob:http://localhost:3000/fake-uuid-1234',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        addLog(
          'success',
          'BLOB_URL_REJECTED',
          isEn
            ? `Backend properly rejected temporary blob: URL (HTTP ${res.status})`
            : `Backend đã từ chối blob: URL tạm thời (HTTP ${res.status})`,
          {
            errorCode: data?.errorCode,
            message: data?.message,
          }
        );
        showToast(
          isEn
            ? `Blob URL protection works: ${data?.message}`
            : `Bảo vệ URL Blob hoạt động tốt: ${data?.message}`,
          'success'
        );
      } else {
        addLog(
          'warn',
          'BLOB_URL_ACCEPTED',
          isEn
            ? 'Warning: Backend accepted Blob URL without physical file!'
            : 'Cảnh báo: Backend chấp nhận URL Blob mà không có file!',
          data
        );
      }
    } catch (e: any) {
      addLog(
        'error',
        'TEST_FAILED',
        (isEn ? 'Error calling test API: ' : 'Lỗi khi gọi API kiểm tra: ') + e.message
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-3xl bg-linear-to-r from-slate-900 to-indigo-950 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">Audio Diagnostic Studio</h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 text-[10px] font-mono font-bold">
                /debug/audio
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'End-to-end diagnostic studio: Microphone → MediaRecorder → File Blob → Storage → Gemini 3.5 Transcribe → Database'
                : 'Công cụ kiểm thử toàn diện: Microphone → MediaRecorder → File Blob → Storage → Gemini 3.5 Transcribe → Database'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('recorder')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
        >
          <Mic className="w-4 h-4 text-indigo-400" />
          <span>{isEn ? 'Back to Lecture Recorder' : 'Về trang ghi âm chính'}</span>
        </button>
      </div>

      {/* Grid: Test Steps Panel + Live Log Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 20-Step Checklist */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Microphone & Permission Status */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Check Microphone & Permission' : 'Kiểm tra Microphone & Cấp quyền'}
                </h3>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  micPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : micPermission === 'denied'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {micPermission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isEn ? 'Granted' : 'Đã cấp quyền'}
                  </>
                ) : micPermission === 'denied' ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {isEn ? 'Denied' : 'Bị từ chối'}
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    {isEn ? 'Not Granted' : 'Chưa cấp quyền'}
                  </>
                )}
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span>{isEn ? 'Active Input Device:' : 'Thiết bị đang kích hoạt:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {activeDeviceLabel || (isEn ? 'Not connected' : 'Chưa kết nối')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>{isEn ? 'Supported Recording Format:' : 'Định dạng ghi âm hỗ trợ:'}</span>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  {supportedMimeTypes[0] || 'audio/webm'}
                </span>
              </div>
            </div>

            {/* Live Volume Meter */}
            {micPermission === 'granted' && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>{isEn ? 'Live Microphone Signal Level:' : 'Tín hiệu âm lượng thu được từ mic:'}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{micVolume}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      micVolume > 60
                        ? 'bg-emerald-500'
                        : micVolume > 15
                        ? 'bg-indigo-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={requestMicCheck}
              disabled={isMicTesting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Mic className="w-4 h-4" />
              <span>
                {isMicTesting
                  ? isEn
                    ? 'Testing...'
                    : 'Đang kiểm tra...'
                  : isEn
                  ? 'Test Microphone'
                  : 'Bấm kiểm tra microphone'}
              </span>
            </button>
          </div>

          {/* STEP 2: Ghi âm thử & Đếm thời gian */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Record 10-Second Test & Inspect Blob' : 'Ghi âm thử trong 10 giây & Kiểm tra Blob'}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-slate-500">
                {formatDuration(recordingDuration)}
              </span>
            </div>

            {/* Recorder controls */}
            <div className="flex flex-wrap items-center gap-2">
              {recorderState === 'idle' ? (
                <>
                  <button
                    onClick={() => startRecording(10)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isEn ? '10s Test Recording (Auto-Stop)' : 'Nói thử 10 giây (Tự động dừng)'}</span>
                  </button>
                  <button
                    onClick={() => startRecording(0)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isEn ? 'Manual Recording' : 'Ghi âm thủ công'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isEn ? 'Stop Recording' : 'Dừng ghi âm'}</span>
                </button>
              )}

              {recorderState === 'stopped' && (
                <button
                  onClick={() => {
                    setRecorderState('idle');
                    setAudioBlob(null);
                    setAudioUrl(null);
                    setRecordingDuration(0);
                    setStorageResult(null);
                    setTranscriptResult(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Clear & Retry' : 'Xóa và thử lại'}</span>
                </button>
              )}
            </div>

            {/* Blob Inspection */}
            {audioBlob && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEn ? 'Valid audioBlob.size:' : 'audioBlob.size hợp lệ:'}</span>
                  </span>
                  <span className="font-mono text-sm">
                    {formatFileSize(audioBlob.size)} ({audioBlob.size} bytes)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{isEn ? 'Blob MIME Type:' : 'MIME Type của Blob:'}</span>
                  <span className="font-mono">{audioBlob.type || audioMimeType}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{isEn ? 'Recording Duration:' : 'Thời lượng ghi âm:'}</span>
                  <span className="font-mono">
                    {recordingDuration} {isEn ? 'sec' : 'giây'}
                  </span>
                </div>

                {/* Direct Download Button for external media player */}
                {downloadUrl && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {isEn ? 'Test in external media player:' : 'Kiểm tra trình phát ngoài trình duyệt:'}
                    </span>
                    <a
                      href={downloadUrl}
                      download={`test-recording-${Date.now()}.${audioMimeType.includes('wav') ? 'wav' : 'webm'}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[11px] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Download File (.webm)' : 'Tải file về máy (.webm)'}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Built-in Audio Player Playback */}
            {audioBlob && (
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {isEn ? 'Play Back via Audio Player:' : 'Nghe lại bằng Audio Player:'}
                </div>
                <AudioPlayer
                  blob={audioBlob}
                  fileName={isEn ? 'Diagnostic Test Recording' : 'Bản ghi âm thử nghiệm'}
                  duration={recordingDuration}
                  size={audioBlob.size}
                />
              </div>
            )}
          </div>

          {/* STEP 3: Upload lên Storage & Gọi Gemini Transcribe */}
          {audioBlob && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Server Storage & Gemini AI Transcription' : 'Lưu trữ Storage & Nhận diện Gemini AI'}
                </h3>
              </div>

              {/* Subject Selection & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isEn ? 'Subject' : 'Môn học'}
                  </label>
                  <select
                    value={targetSubjectId}
                    onChange={(e) => setTargetSubjectId(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isEn ? 'Lesson Title' : 'Tiêu đề bài học'}
                  </label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons: Upload Storage & Call Transcribe */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleUploadToStorage}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? isEn
                        ? 'Uploading to Storage...'
                        : 'Đang lưu lên Storage...'
                      : isEn
                      ? 'Upload Audio to Storage'
                      : 'Upload file audio lên Storage'}
                  </span>
                </button>

                <button
                  onClick={handleVerifyStorageFile}
                  disabled={!storageResult}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  title={
                    isEn
                      ? 'Send HEAD request to verify physical file on server'
                      : 'Gửi HEAD request để kiểm tra file thật trên server'
                  }
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? 'Verify File on Storage' : 'Kiểm tra file thật trên Storage'}</span>
                </button>

                <button
                  onClick={handleCallAiTranscribe}
                  disabled={isTranscribing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isTranscribing
                      ? isEn
                        ? 'Gemini is processing...'
                        : 'Gemini đang xử lý...'
                      : isEn
                      ? 'Call /api/ai/transcribe'
                      : 'Gọi API /api/ai/transcribe'}
                  </span>
                </button>
              </div>

              {/* Storage confirmation card */}
              {storageResult && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEn ? 'File is stored in Server Storage!' : 'File đã nằm trong Server Storage!'}</span>
                    </div>
                    {verifiedStorageDetails && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-mono text-[10px] font-bold">
                        HTTP {verifiedStorageDetails.status} • {formatFileSize(Number(verifiedStorageDetails.contentLength))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                    <div>
                      <span className="text-slate-500">File ID: </span>
                      {storageResult.fileId}
                    </div>
                    <div>
                      <span className="text-slate-500">Audio URL: </span>
                      <a
                        href={storageResult.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-indigo-600 dark:text-indigo-400"
                      >
                        {storageResult.audioUrl}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Phân tích toàn diện AI (Summary, Flashcard, Quiz, Exercise) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center">
                      4
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {isEn
                        ? 'Full AI Analysis (/api/ai/analyze-audio)'
                        : 'Phân tích toàn diện AI (/api/ai/analyze-audio)'}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAnalyzeWithFullAi}
                    disabled={isFullAiAnalyzing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isFullAiAnalyzing
                        ? isEn
                          ? 'AI is analyzing...'
                          : 'AI đang phân tích...'
                        : isEn
                        ? 'Send Real Audio for Full AI Analysis'
                        : 'Gửi audio thật cho AI phân tích toàn diện'}
                    </span>
                  </button>

                  <button
                    onClick={handleReanalyzeFromStorage}
                    disabled={isReanalyzing || !storageResult}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                    title={
                      isEn
                        ? 'Send AI request with lessonId only so backend reads file from Storage'
                        : 'Gửi request AI chỉ kèm lessonId để backend tự đọc file từ Storage'
                    }
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Re-Analyze from Storage' : 'Thử phân tích lại từ Storage'}</span>
                  </button>
                </div>

                {/* Display Full AI Results */}
                {fullAiResult && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-200">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>
                          {isEn ? 'Full AI analysis succeeded!' : 'Kết quả phân tích toàn diện thành công!'}
                        </span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-950 font-mono">
                        isRealAi: {fullAiResult.isRealAi ? 'true' : 'false'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-bold">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900">
                        <div className="text-slate-500 text-[10px]">{isEn ? 'Summary' : 'Tóm tắt'}</div>
                        <div className="text-sm text-purple-600 font-mono">
                          {fullAiResult.summary?.length || 0} {isEn ? 'chars' : 'ký tự'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900">
                        <div className="text-slate-500 text-[10px]">Flashcards</div>
                        <div className="text-sm text-indigo-600 font-mono">
                          {fullAiResult.flashcards?.length || 0} {isEn ? 'cards' : 'thẻ'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900">
                        <div className="text-slate-500 text-[10px]">{isEn ? 'Quiz' : 'Trắc nghiệm'}</div>
                        <div className="text-sm text-emerald-600 font-mono">
                          {fullAiResult.quizQuestions?.length || 0} {isEn ? 'questions' : 'câu'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900">
                        <div className="text-slate-500 text-[10px]">{isEn ? 'Exercises' : 'Bài tập'}</div>
                        <div className="text-sm text-amber-600 font-mono">
                          {fullAiResult.exercises?.length || 0} {isEn ? 'items' : 'bài'}
                        </div>
                      </div>
                    </div>

                    {/* Summary text */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-purple-100 dark:border-purple-900 leading-relaxed">
                      <span className="font-bold text-slate-900 dark:text-white block mb-1">
                        {isEn ? 'Summary:' : 'Tóm tắt:'}
                      </span>
                      {cleanAiResponse(fullAiResult.summary)}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 5: Kiểm tra các trường hợp ngoại lệ (Edge Cases) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center justify-center">
                    5
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {isEn ? 'Edge Cases & Backend Protection Tests' : 'Kiểm tra các trường hợp ngoại lệ & Bảo vệ hệ thống'}
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleTestEmptyFile}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    {isEn ? 'Test 0-Byte Empty File' : 'Thử gửi file 0 bytes'}
                  </button>

                  <button
                    onClick={handleTestInvalidFormat}
                    className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    {isEn ? 'Test Invalid Format (.txt)' : 'Thử gửi định dạng không hợp lệ (.txt)'}
                  </button>

                  <button
                    onClick={handleTestBlobUrlOnly}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    {isEn ? 'Test Sending blob: URL Only' : 'Thử chỉ gửi blob: URL'}
                  </button>
                </div>
              </div>

              {/* Gemini Transcript Display */}
              {transcriptResult && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isEn ? 'Speech Recognition Result (Gemini):' : 'Kết quả nhận diện giọng nói (Gemini):'}
                      </span>
                    </span>
                    <span className="text-slate-500 font-normal">
                      {transcriptResult.transcript?.length || 0} {isEn ? 'chars' : 'ký tự'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 max-h-48 overflow-y-auto whitespace-pre-line border border-slate-200 dark:border-slate-700">
                    {cleanAiResponse(transcriptResult.transcript)}
                  </div>

                  {/* Save to database button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleSaveLessonWithTranscript}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>
                        {isEn ? 'Save Transcript to Lesson (Database)' : 'Lưu transcript vào bài học (Database)'}
                      </span>
                    </button>

                    {savedLessonId && (
                      <button
                        onClick={() => {
                          setActiveSubjectId(targetSubjectId);
                          setActiveLessonId(savedLessonId);
                          setActiveTab('subject-detail');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span>{isEn ? 'Open Saved Lesson' : 'Mở bài học vừa lưu'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Safe Non-Sensitive Real-Time Log Console */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 text-slate-200 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Debug Safe Log Console</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                {isEn ? 'Clear logs' : 'Xóa log'}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              {isEn
                ? 'Logs diagnostic telemetry: File name, File size, MIME type, Blob size, Recorder state, API status, Error code. Never logs API keys or sensitive data.'
                : 'Log các thông tin kiểm thử: File name, File size, MIME type, Blob size, Recorder state, API status, Error code. Tuyệt đối không log API key hoặc thông tin nhạy cảm.'}
            </p>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  {isEn
                    ? 'No logs yet. Click the buttons on the left to start testing.'
                    : 'Chưa có log. Hãy bấm các nút bên trái để bắt đầu kiểm tra.'}
                </div>
              ) : (
                logs.map((log) => {
                  const badgeColor =
                    log.level === 'success'
                      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                      : log.level === 'error'
                      ? 'text-rose-400 bg-rose-950/60 border-rose-800'
                      : log.level === 'warn'
                      ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                      : 'text-indigo-400 bg-indigo-950/60 border-indigo-800';

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {log.category}
                        </span>
                        <span className="text-slate-500 text-[10px]">{log.time}</span>
                      </div>
                      <div className="text-slate-200 font-sans font-medium">{log.message}</div>
                      {Object.keys(log.data).length > 0 && (
                        <pre className="p-2 rounded bg-slate-900 text-slate-300 text-[10px] overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


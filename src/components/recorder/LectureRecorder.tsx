import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { transcribeAudio, analyzeLesson, uploadAudioFile, syncAppState, analyzeAudio, analyzeStoredAudio, AnalyzeAudioResponse } from '../../services/api';
import {
  formatDuration,
  formatFileSize,
  safeConfirm,
  cleanAiResponse,
  getSupportedAudioMimeType,
} from '../../utils/formatters';
import { AudioPlayer } from '../common/AudioPlayer';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Volume2,
  Trash2,
  FileAudio,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Download,
} from 'lucide-react';

// Lifecycle states strictly required: RECORDING -> UPLOADING -> TRANSCRIBING -> TRANSCRIBED -> GENERATING_LESSON -> COMPLETED -> FAILED -> AI_QUOTA_EXCEEDED
export type AudioLifecycleStatus =
  | 'idle'
  | 'recording'
  | 'recorded'
  | 'uploading'
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'generating_lesson'
  | 'completed'
  | 'failed'
  | 'ai_quota_exceeded';

export const LectureRecorder: React.FC = () => {
  const {
    currentUser,
    subjects,
    lessons,
    activeSubjectId,
    setActiveSubjectId,
    addLesson,
    addFlashcards,
    addQuiz,
    addDeadline,
    incrementAudioUsage,
    incrementAiUsage,
    showToast,
    setActiveLessonId,
    setActiveTab,
    language,
  } = useApp();

  // Selected subject & metadata
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    activeSubjectId || (subjects[0]?.id || '')
  );
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [classroom, setClassroom] = useState('');
  const [initialNotes, setInitialNotes] = useState('');

  const [lifecycleStatus, setLifecycleStatus] = useState<AudioLifecycleStatus>('idle');
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);

  // Audio object states
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioStorageUrl, setAudioStorageUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioSize, setAudioSize] = useState<number>(0);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [audioError, setAudioError] = useState<string | null>(null);

  // Stepped loading and error tracking
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [errorStep, setErrorStep] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transcript review & editing before deep analysis
  const [transcript, setTranscript] = useState<string>('');
  const [transcriptWarnings, setTranscriptWarnings] = useState<string[]>([]);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup Object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  // Sync state to server
  useEffect(() => {
    if (subjects.length > 0 || lessons.length > 0) {
      syncAppState(subjects, lessons);
    }
  }, [subjects, lessons]);

  // Request Mic & Start Recording
  const startRecording = async () => {
    setAudioError(null);
    setErrorStep(null);
    setErrorMessage(null);

    // 1. Check browser support for MediaDevices
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      const unsupportedMsg =
        language === 'vi'
          ? 'Trình duyệt hiện tại không hỗ trợ ghi âm. Vui lòng sử dụng Chrome, Edge hoặc Firefox phiên bản mới.'
          : 'Your browser does not support audio recording. Please use a modern version of Chrome, Edge, or Firefox.';
      setAudioError(unsupportedMsg);
      showToast(unsupportedMsg, 'error');
      return;
    }

    // 2. Check HTTPS or localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (window.location.protocol !== 'https:' && !isLocalhost) {
      const httpsMsg =
        language === 'vi'
          ? 'Microphone chỉ hoạt động trên kết nối bảo mật HTTPS hoặc localhost.'
          : 'Microphone requires a secure HTTPS connection or localhost.';
      setAudioError(httpsMsg);
      showToast(httpsMsg, 'error');
      return;
    }

    try {
      // 3. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best supported MIME type
      const supportedMime = getSupportedAudioMimeType() || 'audio/webm';
      setAudioMimeType(supportedMime);

      const recorder = new MediaRecorder(
        stream,
        supportedMime ? { mimeType: supportedMime } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        setRecordingState('recording');
        setLifecycleStatus('recording');
        setDuration(0);
        console.log('[Recorder State] recording started, MIME:', supportedMime);
      };

      recorder.onpause = () => {
        setRecordingState('paused');
      };

      recorder.onresume = () => {
        setRecordingState('recording');
      };

      recorder.ondataavailable = (event) => {
        // Only add chunk if event.data.size > 0
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || supportedMime || 'audio/webm';
        let extension = 'webm';
        if (finalMime.includes('mp4')) extension = 'mp4';
        else if (finalMime.includes('wav')) extension = 'wav';
        else if (finalMime.includes('ogg')) extension = 'ogg';

        // Assemble chunks into Blob
        const blob = new Blob(audioChunksRef.current, { type: finalMime });

        console.log('[Recorder State] recording stopped. Chunks:', audioChunksRef.current.length, 'Blob size:', blob.size, 'MIME:', finalMime);

        if (blob.size === 0) {
          setAudioError(
            language === 'vi'
              ? 'File ghi âm rỗng (0 bytes). Hãy kiểm tra microphone và nói to hơn.'
              : 'Recorded audio file is empty (0 bytes). Please check your microphone and speak louder.'
          );
          setRecordingState('idle');
          setLifecycleStatus('idle');
          return;
        }

        // Create File with clear name (Section 3.2)
        const file = new File(
          [blob],
          extension === 'webm' ? 'lesson-recording.webm' : `lesson-recording.${extension}`,
          { type: blob.type || finalMime || 'audio/webm' }
        );

        // Revoke previous URL if any
        if (audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
        }

        const previewUrl = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioFile(file);
        setAudioPreviewUrl(previewUrl);
        setAudioSize(blob.size);
        setAudioDuration(duration);
        setAudioMimeType(finalMime);
        setRecordingState('stopped');
        setLifecycleStatus('recorded');

        // Release microphone hardware light
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.onerror = (ev: any) => {
        console.error('MediaRecorder error:', ev);
        setAudioError(
          (language === 'vi' ? 'Lỗi trong quá trình ghi âm: ' : 'Error during recording: ') +
            (ev?.error?.message || (language === 'vi' ? 'Lỗi không xác định' : 'Unknown error'))
        );
        setLifecycleStatus('failed');
      };

      recorder.start(1000); // 1-second chunks
      setRecordingState('recording');
      setLifecycleStatus('recording');

      // Timer management
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      let msg =
        language === 'vi'
          ? 'Không thể ghi âm vì trình duyệt chưa được cấp quyền microphone. Hãy cho phép microphone trong thanh địa chỉ trình duyệt rồi thử lại.'
          : 'Cannot record because microphone permission was denied. Please allow microphone access in your browser address bar and try again.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg =
          language === 'vi'
            ? 'Không tìm thấy thiết bị Microphone kết nối với máy tính/điện thoại của bạn.'
            : 'No microphone device found connected to your computer or phone.';
      } else if (err.name === 'NotSupportedError') {
        msg =
          language === 'vi'
            ? 'Trình duyệt hiện tại không hỗ trợ ghi âm. Vui lòng sử dụng Chrome, Edge hoặc Firefox phiên bản mới.'
            : 'Your browser does not support audio recording. Please use a modern version of Chrome, Edge, or Firefox.';
      }
      setAudioError(msg);
      setLifecycleStatus('idle');
      showToast(msg, 'error');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      } catch (e) {
        console.warn('requestData error:', e);
      }
      mediaRecorderRef.current.stop();
      setRecordingState('stopped');
      setLifecycleStatus('recorded');
      if (timerRef.current) clearInterval(timerRef.current);
      showToast(
        language === 'vi'
          ? 'Đã ghi âm xong bài giảng! Bạn có thể nghe lại ngay bên dưới.'
          : 'Lecture recording completed! You can listen to it below.',
        'success'
      );
    }
  };

  const cancelRecording = () => {
    if (
      safeConfirm(
        language === 'vi'
          ? 'Bạn có chắc chắn muốn hủy bản ghi âm này không? Toàn bộ dữ liệu vừa ghi sẽ bị xóa.'
          : 'Are you sure you want to cancel this recording? All recorded data will be discarded.'
      )
    ) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }

      setRecordingState('idle');
      setAudioBlob(null);
      setAudioFile(null);
      setAudioPreviewUrl(null);
      setAudioStorageUrl(null);
      setDuration(0);
      setAudioDuration(0);
      setAudioSize(0);
      setAudioError(null);
      setTranscript('');
      setTranscriptWarnings([]);
      showToast(language === 'vi' ? 'Đã hủy bản ghi âm.' : 'Recording cancelled.', 'info');
    }
  };

  // Upload file from local device
  // Pre-upload validation strictly complying with PHẦN 2
  const validateAudioFile = (fileToValidate: File | null) => {
    if (!fileToValidate) {
      throw new Error(language === 'vi' ? 'Chưa chọn file âm thanh.' : 'No audio file selected.');
    }
    if (!(fileToValidate instanceof File)) {
      throw new Error(
        language === 'vi' ? 'Dữ liệu âm thanh không phải là File hợp lệ.' : 'Invalid audio file data.'
      );
    }
    if (fileToValidate.size === 0) {
      throw new Error(language === 'vi' ? 'File âm thanh đang rỗng.' : 'Audio file is empty.');
    }
    if (fileToValidate.size > 100 * 1024 * 1024) {
      throw new Error(
        language === 'vi' ? 'File âm thanh vượt quá giới hạn 100MB.' : 'Audio file exceeds 100MB limit.'
      );
    }
  };

  // Upload file from local device (PHẦN 2 & PHẦN 3)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.webm', '.mp3', '.wav', '.mp4', '.m4a', '.ogg', '.aac', '.mpeg'];
    const ext = (file.name.substring(file.name.lastIndexOf('.')) || '').toLowerCase();
    const isAudioMime = file.type.startsWith('audio/') || file.type.includes('webm') || file.type.includes('mp4');

    if (!isAudioMime && !validExtensions.includes(ext)) {
      showToast(
        language === 'vi'
          ? 'Định dạng file âm thanh không được hỗ trợ. Vui lòng tải file WebM, MP3, WAV, M4A hoặc OGG.'
          : 'Unsupported audio file format. Please upload WebM, MP3, WAV, M4A, or OGG.',
        'error'
      );
      return;
    }

    if (file.size === 0) {
      showToast(
        language === 'vi' ? 'File âm thanh đang rỗng (0 bytes).' : 'Audio file is empty (0 bytes).',
        'error'
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast(
        language === 'vi' ? 'File âm thanh vượt quá giới hạn 100MB.' : 'Audio file exceeds 100MB limit.',
        'error'
      );
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioFile(file);
    setAudioPreviewUrl(previewUrl);
    setAudioSize(file.size);
    setAudioMimeType(file.type || 'audio/mp3');
    setRecordingState('stopped');
    setLifecycleStatus('recorded');
    setAudioError(null);
    setErrorStep(null);
    setErrorMessage(null);
    setTranscript('');
    setTranscriptWarnings([]);

    // Estimate duration
    const estimatedDur = Math.max(30, Math.round(file.size / 16000));
    setDuration(estimatedDur);
    setAudioDuration(estimatedDur);

    if (!lessonTitle) {
      setLessonTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    showToast(
      language === 'vi'
        ? `Đã chọn file "${file.name}" (${formatFileSize(file.size)})!`
        : `Selected "${file.name}" (${formatFileSize(file.size)})!`,
      'success'
    );
  };

  const [isSavingAudioOnly, setIsSavingAudioOnly] = useState(false);
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);

  /**
   * Action 1: Upload and Save Audio Only (PHẦN 7 & PHẦN 8)
   * Completely independent of Gemini AI. Always succeeds even if AI quota is exhausted!
   */
  const handleSaveAudioOnly = async () => {
    const effectiveSubjectId = selectedSubjectId || subjects[0]?.id || 'sub_web_01';

    try {
      validateAudioFile(audioFile);
    } catch (valErr: any) {
      showToast(valErr.message, 'error');
      setAudioError(valErr.message);
      return;
    }

    const title =
      lessonTitle.trim() ||
      (language === 'vi' ? `Bài giảng ngày ${lessonDate}` : `Lecture on ${lessonDate}`);
    const cleanMime = audioMimeType || audioFile?.type || 'audio/webm';
    const targetLessonId = createdLessonId || `les_${Date.now()}`;

    setIsSavingAudioOnly(true);
    setAudioError(null);
    setErrorMessage(null);

    try {
      const uploadRes = await uploadAudioFile({
        audioFile,
        mimeType: cleanMime,
        fileName: audioFile?.name || `${title}.${cleanMime.includes('webm') ? 'webm' : 'mp3'}`,
        duration,
        subjectId: effectiveSubjectId,
        lessonId: targetLessonId,
      });

      setAudioStorageUrl(uploadRes.audioUrl);
      setCreatedLessonId(targetLessonId);

      addLesson({
        id: targetLessonId,
        ownerId: currentUser?.id || '',
        subjectId: effectiveSubjectId,
        title: cleanAiResponse(title),
        lessonDate,
        classroom,
        initialNotes,
        audioUrl: uploadRes.audioUrl,
        storagePath: uploadRes.storagePath,
        audioMimeType: cleanMime,
        audioDuration: duration || 1200,
        audioSize: uploadRes.fileSize,
        transcriptionStatus: 'uploaded',
        summaryStatus: 'idle',
        analysisStatus: 'idle',
        sourceType: 'audio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setLifecycleStatus('uploaded');
      showToast(
        language === 'vi' ? 'Đã tải file âm thanh lên thành công.' : 'Audio file uploaded successfully.',
        'success'
      );
    } catch (upErr: any) {
      console.error('Lỗi khi tải file âm thanh lên:', upErr);
      const msg =
        upErr?.message ||
        (language === 'vi' ? 'Không thể tải file âm thanh lên.' : 'Could not upload audio file.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingAudioOnly(false);
    }
  };

  /**
   * Action 2: Process Audio with AI (Section 3.2, 4.1, 4.2)
   * Step 1: Upload & Transcribe audio via POST /api/ai/transcribe (FormData with 'file' and 'lessonId')
   * Step 2: Create/update lesson with non-empty transcript + audioUrl (status: TRANSCRIBED)
   * Step 3: Generate summary, flashcards, quiz, mindMap from transcript via POST /api/ai/analyze-lesson (status: COMPLETED)
   * Supports retrying transcription ("Nhận diện lại") or retrying lesson generation ("Tạo bài học lại") without re-recording.
   */
  const handleProcessAudio = async (options?: { skipTranscriptionIfPresent?: boolean }) => {
    if (isAnalyzing) return;

    if (recordingState === 'recording') {
      const msg =
        language === 'vi'
          ? 'Hãy dừng ghi âm trước khi gửi cho AI.'
          : 'Please stop recording before sending to AI.';
      showToast(msg, 'error');
      setAudioError(msg);
      return;
    }

    const effectiveSubjectId = selectedSubjectId || subjects[0]?.id || 'sub_web_01';

    const reuseExistingTranscript = Boolean(options?.skipTranscriptionIfPresent && transcript.trim().length > 0);
    const canUseStoredAudio = !audioFile && Boolean(audioStorageUrl || createdLessonId);

    if (!reuseExistingTranscript && !canUseStoredAudio) {
      if (!audioFile) {
        const msg = language === 'vi' ? 'Chưa có file ghi âm hợp lệ.' : 'No valid audio file found.';
        showToast(msg, 'error');
        setAudioError(msg);
        return;
      }

      if (!(audioFile instanceof File)) {
        showToast(
          language === 'vi' ? 'Chưa có file ghi âm hợp lệ.' : 'No valid audio file found.',
          'error'
        );
        setAudioError(
          language === 'vi' ? 'Dữ liệu âm thanh không phải là File hợp lệ.' : 'Invalid audio file data.'
        );
        return;
      }

      if (audioFile.size === 0) {
        const msg = language === 'vi' ? 'File ghi âm đang rỗng.' : 'Audio file is empty.';
        showToast(msg, 'error');
        setAudioError(msg);
        return;
      }
    }

    const subject = subjects.find((s) => s.id === effectiveSubjectId);
    const title =
      lessonTitle.trim() ||
      (language === 'vi' ? `Bài giảng ngày ${lessonDate}` : `Lecture on ${lessonDate}`);
    const cleanMime = audioMimeType || audioFile?.type || 'audio/webm';
    let targetLessonId = createdLessonId || `les_${Date.now()}`;
    let currentAudioUrl = audioStorageUrl || '';
    let activeTranscript = reuseExistingTranscript ? transcript.trim() : '';

    setIsAnalyzing(true);
    setErrorStep(null);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      // STEP 1: Upload & Speech-to-Text Transcription via POST /api/ai/transcribe
      if (!activeTranscript) {
        setLifecycleStatus('uploading');
        setErrorStep(language === 'vi' ? 'Đang tải file lên & nhận diện giọng nói' : 'Uploading & transcribing audio');
        setAnalysisStep(
          language === 'vi'
            ? 'Đang tải file âm thanh lên máy chủ & nhận diện giọng nói (Speech-to-Text)...'
            : 'Uploading audio file & transcribing speech to text...'
        );
        setAnalysisProgress(25);

        setLifecycleStatus('transcribing');
        const transcribeRes = await transcribeAudio({
          audioFile: canUseStoredAudio ? null : audioFile,
          audioBlob: canUseStoredAudio ? null : audioBlob,
          lessonId: targetLessonId,
          subjectId: effectiveSubjectId,
          subjectName: subject?.name || 'Môn học',
          title,
          duration,
          mimeType: cleanMime,
        });

        if (transcribeRes.lessonId) {
          targetLessonId = transcribeRes.lessonId;
        }
        setCreatedLessonId(targetLessonId);

        if (transcribeRes.audioUrl && !transcribeRes.audioUrl.startsWith('blob:')) {
          currentAudioUrl = transcribeRes.audioUrl;
          setAudioStorageUrl(transcribeRes.audioUrl);
        }

        if (Array.isArray(transcribeRes.warnings) && transcribeRes.warnings.length > 0) {
          setTranscriptWarnings(transcribeRes.warnings);
        }

        activeTranscript = cleanAiResponse(transcribeRes.transcript || '').trim();
        if (!activeTranscript) {
          const emptyErr: any = new Error(
            language === 'vi'
              ? 'AI không nhận diện được văn bản từ bản ghi âm. Vui lòng kiểm tra âm lượng microphone hoặc thử nhận diện lại.'
              : 'AI could not recognize speech from the recording. Please check microphone volume or retry transcription.'
          );
          emptyErr.errorCode = 'AI_EMPTY_RESPONSE';
          emptyErr.audioUrl = currentAudioUrl;
          emptyErr.fileSaved = Boolean(currentAudioUrl);
          throw emptyErr;
        }

        setTranscript(activeTranscript);
        setLifecycleStatus('transcribed');
        setAnalysisProgress(55);

        // Immediately save/update lesson with transcript + real audioUrl in AppContext (status: TRANSCRIBED)
        const transcribedLessonPayload = {
          id: targetLessonId,
          ownerId: currentUser?.id || '',
          subjectId: effectiveSubjectId,
          title: cleanAiResponse(title),
          lessonDate,
          classroom,
          initialNotes,
          audioUrl: currentAudioUrl || undefined,
          audioMimeType: cleanMime,
          audioDuration: duration || 1200,
          audioSize: audioFile?.size || audioSize,
          transcript: activeTranscript,
          transcriptionStatus: 'completed' as const,
          summaryStatus: 'processing' as const,
          analysisStatus: 'analyzing' as const,
          sourceType: 'audio' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addLesson(transcribedLessonPayload);
      }

      // Guard: Never call summary/lesson generation if transcript is empty (Section 4.1)
      if (!activeTranscript || activeTranscript.trim().length === 0) {
        const emptyErr: any = new Error(
          language === 'vi'
            ? 'Chưa có transcript hợp lệ để tạo tóm tắt và bài học.'
            : 'No valid transcript available to generate summary and lesson.'
        );
        emptyErr.errorCode = 'AI_INPUT_EMPTY';
        throw emptyErr;
      }

      // STEP 2: Generate Lesson (Summary, KeyPoints, Flashcards, Quiz, MindMap) from Transcript via POST /api/ai/analyze-lesson
      setLifecycleStatus('generating_lesson');
      setErrorStep(language === 'vi' ? 'Đang tạo tóm tắt, flashcard và bài học từ transcript' : 'Generating lesson from transcript');
      setAnalysisStep(
        language === 'vi'
          ? 'Đang tạo tóm tắt, ý chính, flashcard và câu hỏi trắc nghiệm từ transcript...'
          : 'Generating summary, key points, flashcards, and quiz from transcript...'
      );
      setAnalysisProgress(75);

      const lessonAnalysis = await analyzeLesson({
        transcript: activeTranscript,
        title,
        subjectName: subject?.name || 'Môn học',
        initialNotes,
        lessonId: targetLessonId,
        subjectId: effectiveSubjectId,
        includeFlashcards: true,
        includeQuiz: true,
        includeMindMap: currentUser?.plan === 'premium',
      });

      const analyzeRes = lessonAnalysis.result;
      setAnalysisProgress(100);

      // Save completed lesson to AppContext
      const completedLessonPayload = {
        id: targetLessonId,
        ownerId: currentUser?.id || '',
        subjectId: effectiveSubjectId,
        title: cleanAiResponse(title),
        lessonDate,
        classroom,
        initialNotes,
        audioUrl: currentAudioUrl || audioStorageUrl || undefined,
        audioMimeType: cleanMime,
        audioDuration: duration || 1200,
        audioSize: audioFile?.size || audioSize,
        transcript: activeTranscript,
        summary: cleanAiResponse(analyzeRes.summary || ''),
        keyPoints: analyzeRes.keyPoints || [],
        keywords: analyzeRes.keywords || [],
        concepts: analyzeRes.concepts || [],
        mindMap: analyzeRes.mindMap,
        flashcards: analyzeRes.flashcards || [],
        quizQuestions: analyzeRes.quizQuestions || [],
        deadlines: analyzeRes.deadlines || [],
        transcriptionStatus: 'completed' as const,
        summaryStatus: 'completed' as const,
        analysisStatus: 'completed' as const,
        analyzedAt: new Date().toISOString(),
        sourceType: 'audio' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addLesson(completedLessonPayload);

      // Save flashcards
      if (analyzeRes.flashcards && analyzeRes.flashcards.length > 0) {
        const flashcardsToSave = analyzeRes.flashcards.map((fc: any, idx: number) => ({
          id: fc.id || `fc_${Date.now()}_${idx}`,
          ownerId: currentUser?.id || '',
          subjectId: effectiveSubjectId,
          lessonId: targetLessonId,
          front: cleanAiResponse(fc.front),
          back: cleanAiResponse(fc.back),
          example: fc.example ? cleanAiResponse(fc.example) : undefined,
          difficulty: (fc.difficulty as any) || 'medium',
          topic: cleanAiResponse(fc.topic || subject?.name || (language === 'vi' ? 'Tổng hợp' : 'General')),
          reviewStatus: 'new' as const,
          correctCount: 0,
          incorrectCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        addFlashcards(flashcardsToSave);
      }

      // Save quiz
      if (analyzeRes.quizQuestions && analyzeRes.quizQuestions.length > 0) {
        addQuiz({
          id: `quiz_${targetLessonId}`,
          ownerId: currentUser?.id || '',
          subjectId: selectedSubjectId,
          lessonId: targetLessonId,
          title: cleanAiResponse(language === 'vi' ? `Trắc nghiệm: ${title}` : `Quiz: ${title}`),
          questions: analyzeRes.quizQuestions.map((q: any) => ({
            ...q,
            question: cleanAiResponse(q.question),
            explanation: cleanAiResponse(q.explanation),
            options: (q.options || []).map((o: string) => cleanAiResponse(o)),
            difficulty: (q.difficulty as any) || 'medium',
          })),
          difficulty: 'medium',
          createdAt: new Date().toISOString(),
        });
      }

      // Save deadlines
      if (analyzeRes.deadlines && analyzeRes.deadlines.length > 0) {
        analyzeRes.deadlines.forEach((dl: any) => {
          addDeadline({
            subjectId: selectedSubjectId,
            title: cleanAiResponse(dl.title),
            dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            dueTime: dl.dueTime || '23:59',
            priority: (dl.priority as any) || 'medium',
            status: 'todo',
            type: 'assignment',
            sourceType: 'ai_transcript',
            sourceId: targetLessonId,
            sourceText: dl.sourceText || dl.title,
            aiConfidence: dl.confidence || 0.9,
            isAiSuggested: false,
          });
        });
      }

      setLifecycleStatus('completed');
      incrementAudioUsage(Math.ceil((duration || 600) / 60));
      incrementAiUsage(1);

      showToast(
        language === 'vi'
          ? '🎉 Tạo transcript, tóm tắt và bài học hoàn tất!'
          : '🎉 Transcript, summary, and lesson generation completed!',
        'success'
      );
      setActiveSubjectId(selectedSubjectId);
      setActiveLessonId(targetLessonId);
      setActiveTab('subject-detail');
    } catch (err: any) {
      console.warn('Lỗi phân tích AI:', err);

      const isQuota = err.errorCode === 'AI_QUOTA_EXCEEDED' || err.isDailyQuota;
      setErrorCode(err.errorCode || 'ANALYSIS_ERROR');

      if (err.audioUrl && !String(err.audioUrl).startsWith('blob:')) {
        currentAudioUrl = err.audioUrl;
        setAudioStorageUrl(err.audioUrl);
      }

      const fileAlreadySaved = Boolean(currentAudioUrl || audioStorageUrl || err.fileSaved);

      if (fileAlreadySaved) {
        const resolvedAudioUrl = currentAudioUrl || audioStorageUrl;
        if (resolvedAudioUrl) setAudioStorageUrl(resolvedAudioUrl);
        setCreatedLessonId(targetLessonId);

        const existingLesson = lessons.find((l) => l.id === targetLessonId);
        if (!existingLesson) {
          addLesson({
            id: targetLessonId,
            ownerId: currentUser?.id || '',
            subjectId: selectedSubjectId,
            title: cleanAiResponse(title),
            lessonDate,
            classroom,
            initialNotes,
            audioUrl: resolvedAudioUrl || undefined,
            storagePath: err.storagePath,
            audioMimeType: cleanMime,
            audioDuration: duration || 1200,
            audioSize: audioFile?.size || audioSize,
            transcript: activeTranscript || undefined,
            transcriptionStatus: activeTranscript ? 'completed' : isQuota ? 'quota_exceeded' : 'failed',
            summaryStatus: isQuota ? 'quota_exceeded' : 'failed',
            analysisStatus: isQuota ? 'quota_exceeded' : 'failed',
            sourceType: 'audio',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      const displayMsg =
        err.message ||
        (language === 'vi'
          ? 'Lỗi khi xử lý âm thanh hoặc tạo bài học bằng AI. File ghi âm của bạn vẫn được giữ an toàn.'
          : 'Error processing audio or generating lesson with AI. Your recording is safely preserved.');

      setErrorMessage(displayMsg);
      showToast(displayMsg, 'error');
      setLifecycleStatus(isQuota ? 'ai_quota_exceeded' : fileAlreadySaved ? 'uploaded' : 'failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'vi' ? 'Ghi âm bài giảng trên lớp' : 'Classroom Lecture Recorder'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'vi'
              ? 'Ghi âm bài giảng trực tiếp bằng microphone hoặc tải lên file âm thanh. AI sẽ chuyển giọng nói thành văn bản, tạo tóm tắt, sơ đồ tư duy và bộ câu hỏi trắc nghiệm.'
              : 'Record lectures live via microphone or upload an audio file. AI will transcribe speech into text, generate summaries, mind maps, and practice quizzes.'}
          </p>
        </div>
        <button
          onClick={() => setActiveTab('debug-audio')}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          🔧 {language === 'vi' ? 'Mở /debug/audio' : 'Open /debug/audio'}
        </button>
      </div>

      {/* Microphone Error Alert */}
      {audioError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold mb-1">
              {language === 'vi' ? 'Thông báo Microphone' : 'Microphone Notice'}
            </div>
            <div>{audioError}</div>
          </div>
        </div>
      )}

      {/* Stepped Error Banner if an AI process failed or Quota Exceeded */}
      {errorMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs space-y-2 ${
            errorCode === 'AI_QUOTA_EXCEEDED'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className={`w-4 h-4 ${errorCode === 'AI_QUOTA_EXCEEDED' ? 'text-amber-600' : 'text-rose-600'}`} />
            <span>
              {errorCode === 'AI_QUOTA_EXCEEDED'
                ? language === 'vi'
                  ? 'Thông báo hạn mức Gemini API (HTTP 429)'
                  : 'Gemini API Quota Notice (HTTP 429)'
                : language === 'vi'
                ? `Lỗi tại bước: ${errorStep}`
                : `Error at step: ${errorStep}`}
            </span>
            {errorCode && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                  errorCode === 'AI_QUOTA_EXCEEDED'
                    ? 'bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100'
                    : 'bg-rose-200 dark:bg-rose-900 text-rose-900'
                }`}
              >
                {errorCode}
              </span>
            )}
          </div>
          <div className="leading-relaxed">{errorMessage}</div>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {createdLessonId && (
              <button
                onClick={() => {
                  setActiveSubjectId(selectedSubjectId);
                  setActiveLessonId(createdLessonId);
                  setActiveTab('subject-detail');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {language === 'vi' ? 'Mở bài học để nghe lại âm thanh' : 'Open lesson to play audio'}
                </span>
              </button>
            )}
            {transcript.trim().length > 0 && (
              <button
                onClick={() => handleProcessAudio({ skipTranscriptionIfPresent: true })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Tạo bài học lại' : 'Retry Lesson Generation'}</span>
              </button>
            )}
            <button
              onClick={() => handleProcessAudio({ skipTranscriptionIfPresent: false })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Nhận diện lại' : 'Retry Transcribe'}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold hover:bg-slate-100 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Tải file khác' : 'Upload another file'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Form Details: Subject, Title, Date */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Chọn môn học' : 'Select Subject'} <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedSubjectId || subjects[0]?.id || 'sub_web_01'}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.length === 0 ? (
                <option value="sub_web_01">
                  {language === 'vi' ? 'Môn học chung (Mặc định)' : 'General Subject (Default)'}
                </option>
              ) : (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Tên bài giảng / Chủ đề' : 'Lecture Title / Topic'}
            </label>
            <input
              type="text"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ: Chương 3: Kiến trúc Microservices'
                  : 'e.g. Chapter 3: Microservices Architecture'
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Ngày học' : 'Lecture Date'}
            </label>
            <input
              type="date"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Phòng học / Địa điểm (tùy chọn)' : 'Classroom / Location (optional)'}
            </label>
            <input
              type="text"
              value={classroom}
              onChange={(e) => setClassroom(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ: Hội trường A4 - Giảng đường 1'
                  : 'e.g. Hall A4 - Lecture Building 1'
              }
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            {language === 'vi'
              ? 'Ghi chú ban đầu hoặc từ khóa trọng tâm'
              : 'Initial Notes or Focus Keywords'}
          </label>
          <textarea
            rows={2}
            value={initialNotes}
            onChange={(e) => setInitialNotes(e.target.value)}
            placeholder={
              language === 'vi'
                ? 'Ví dụ: Thầy nhấn mạnh sẽ có bài kiểm tra tuần sau, chú ý các công thức ở slide 14...'
                : 'e.g. Instructor emphasized next week quiz, pay attention to formulas on slide 14...'
            }
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
          />
        </div>
      </div>

      {/* Main Recording Station */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
        {/* Timer display */}
        <div className="mb-6">
          <div className="font-mono text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-wider">
            {formatDuration(duration)}
          </div>
          <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                recordingState === 'recording'
                  ? 'bg-red-500 animate-ping'
                  : recordingState === 'paused'
                  ? 'bg-amber-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
            <span>
              {recordingState === 'idle' && (language === 'vi' ? 'Chưa ghi âm' : 'Ready to record')}
              {recordingState === 'recording' &&
                (language === 'vi'
                  ? 'Đang ghi âm bài giảng bằng Microphone...'
                  : 'Recording lecture via Microphone...')}
              {recordingState === 'paused' &&
                (language === 'vi' ? 'Tạm dừng ghi âm' : 'Recording paused')}
              {recordingState === 'stopped' &&
                (language === 'vi' ? 'Đã dừng ghi âm' : 'Recording stopped')}
            </span>
          </div>
        </div>

        {/* Audio Wave Visualizer Simulation */}
        {recordingState === 'recording' && (
          <div className="flex items-center justify-center gap-1.5 h-12 mb-8">
            {[6, 12, 22, 34, 18, 36, 24, 40, 16, 28, 12, 34, 22, 14, 26, 10].map((h, i) => (
              <div
                key={i}
                className="w-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-soundwave"
                style={{
                  height: `${h}px`,
                  animationDelay: `${(i * 0.1).toFixed(1)}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {recordingState === 'idle' && (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-transform transform active:scale-90"
              title={language === 'vi' ? 'Bắt đầu ghi âm' : 'Start recording'}
            >
              <Mic className="w-8 h-8" />
            </button>
          )}

          {recordingState === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center justify-center transition-transform active:scale-95"
                title={language === 'vi' ? 'Tạm dừng' : 'Pause'}
              >
                <Pause className="w-6 h-6" />
              </button>
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 flex items-center justify-center transition-transform active:scale-95"
                title={language === 'vi' ? 'Dừng ghi âm' : 'Stop recording'}
              >
                <Square className="w-7 h-7" />
              </button>
              <button
                onClick={cancelRecording}
                className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-700"
                title={language === 'vi' ? 'Hủy bản ghi' : 'Cancel recording'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center transition-transform active:scale-95"
                title={language === 'vi' ? 'Tiếp tục ghi âm' : 'Resume recording'}
              >
                <Play className="w-6 h-6 ml-0.5" />
              </button>
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
                title={language === 'vi' ? 'Dừng và hoàn tất' : 'Stop and finish'}
              >
                <Square className="w-7 h-7" />
              </button>
              <button
                onClick={cancelRecording}
                className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                title={language === 'vi' ? 'Hủy bản ghi' : 'Cancel recording'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}

          {recordingState === 'stopped' && (
            <button
              onClick={() => {
                setRecordingState('idle');
                setDuration(0);
                setAudioDuration(0);
                setAudioBlob(null);
                setAudioFile(null);
                if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
                setAudioPreviewUrl(null);
                setAudioStorageUrl(null);
                setAudioSize(0);
                setTranscript('');
                setTranscriptWarnings([]);
                setErrorStep(null);
                setErrorMessage(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{language === 'vi' ? 'Ghi âm lại từ đầu' : 'Record again from scratch'}</span>
            </button>
          )}
        </div>

        {/* Upload Existing Audio File Alternative */}
        {recordingState === 'idle' && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Upload className="w-4 h-4" />
              <span>
                {language === 'vi'
                  ? 'Hoặc tải lên file ghi âm có sẵn từ máy tính (.mp3, .wav, .webm, .m4a)'
                  : 'Or upload an existing audio recording from your computer (.mp3, .wav, .webm, .m4a)'}
              </span>
            </button>
          </div>
        )}

        {/* Audio Player and Transcription review */}
        {recordingState === 'stopped' && (audioPreviewUrl || audioBlob) && (
          <div className="mt-4 space-y-4 text-left animate-in fade-in">
            {/* Audio Metadata Information Card (PHẦN 2) */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileAudio className="w-4 h-4 text-indigo-600" />
                  <span>{language === 'vi' ? 'Thông tin file âm thanh' : 'Audio File Details'}</span>
                </span>
                {audioPreviewUrl && (
                  <a
                    href={audioPreviewUrl}
                    download={audioFile?.name || `bai_giang_${lessonDate}.webm`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Tải file về máy' : 'Download file'}</span>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100/50 dark:border-slate-800">
                  <span className="text-slate-400 block">{language === 'vi' ? 'Tên file' : 'File name'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {audioFile?.name || `bai_giang_${lessonDate}.webm`}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100/50 dark:border-slate-800">
                  <span className="text-slate-400 block">{language === 'vi' ? 'Dung lượng' : 'File size'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {formatFileSize(audioSize)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100/50 dark:border-slate-800">
                  <span className="text-slate-400 block">{language === 'vi' ? 'Định dạng' : 'Format'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                    {audioMimeType}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100/50 dark:border-slate-800">
                  <span className="text-slate-400 block">{language === 'vi' ? 'Thời lượng' : 'Duration'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {formatDuration(duration)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{language === 'vi' ? 'Nghe lại bản ghi âm bài giảng' : 'Review Lecture Recording'}</span>
              {audioStorageUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 normal-case">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Đã lưu vào Storage' : 'Saved to Storage'}</span>
                </span>
              )}
            </div>

            {/* Audio Player with Blob or Storage URL */}
            <AudioPlayer
              src={audioStorageUrl || audioPreviewUrl || undefined}
              blob={audioBlob || undefined}
              fileName={lessonTitle || `Bai_giang_${lessonDate}`}
              duration={duration}
              size={audioSize}
              autoPlay={false}
              onDelete={() => {
                setRecordingState('idle');
                setDuration(0);
                setAudioBlob(null);
                setAudioFile(null);
                if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
                setAudioPreviewUrl(null);
                setAudioStorageUrl(null);
                setCreatedLessonId(null);
                setAudioSize(0);
                setTranscript('');
              }}
            />

            {/* Transcript Warning Banner if any */}
            {transcriptWarnings.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    {language === 'vi' ? 'Cảnh báo chất lượng âm thanh:' : 'Audio quality warnings:'}
                  </span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                  {transcriptWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Transcript preview if available */}
            {transcript && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>
                    {language === 'vi' ? 'Văn bản đã nhận diện (Transcript):' : 'Recognized Transcript:'}
                  </span>
                  <button
                    onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-[11px]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>
                      {isEditingTranscript
                        ? language === 'vi'
                          ? 'Xong'
                          : 'Done'
                        : language === 'vi'
                        ? 'Chỉnh sửa'
                        : 'Edit'}
                    </span>
                  </button>
                </div>

                {isEditingTranscript ? (
                  <textarea
                    rows={4}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  />
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                    {transcript}
                  </p>
                )}
              </div>
            )}

            {/* Stepped Loading Screen */}
            {isAnalyzing ? (
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                    <span>{analysisStep}</span>
                  </span>
                  <span>{analysisProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full transition-all duration-500"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className={analysisProgress >= 10 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 10 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '1. Kiểm tra file ghi âm' : '1. Check audio file'}
                  </div>
                  <div className={analysisProgress >= 30 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 30 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '2. Đang tải file lên' : '2. Upload file'}
                  </div>
                  <div className={analysisProgress >= 40 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 40 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '3. Đang gửi file đến AI' : '3. Send file to AI'}
                  </div>
                  <div className={analysisProgress >= 55 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 55 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '4. Nhận diện giọng nói' : '4. Speech recognition'}
                  </div>
                  <div className={analysisProgress >= 65 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 65 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '5. Đang tạo transcript' : '5. Generate transcript'}
                  </div>
                  <div className={analysisProgress >= 75 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 75 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '6. Đang tạo tóm tắt' : '6. Generate summary'}
                  </div>
                  <div className={analysisProgress >= 85 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 85 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '7. Đang tạo flashcard' : '7. Generate flashcards'}
                  </div>
                  <div className={analysisProgress >= 95 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 95 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '8. Đang tạo bài tập' : '8. Generate exercises'}
                  </div>
                  <div className={analysisProgress >= 100 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                    {analysisProgress >= 100 ? '✓' : '○'}{' '}
                    {language === 'vi' ? '9. Đang hoàn tất' : '9. Finalize'}
                  </div>
                </div>
              </div>
            ) : (
              /* Two Distinct Action Buttons (PHẦN 7 & PHẦN 8) */
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                {/* Button 1: Save Audio Only */}
                <button
                  type="button"
                  onClick={handleSaveAudioOnly}
                  disabled={isSavingAudioOnly || isAnalyzing}
                  className="w-full sm:w-1/2 py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingAudioOnly ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{language === 'vi' ? 'Đang tải file lên...' : 'Uploading file...'}</span>
                    </>
                  ) : audioStorageUrl ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{language === 'vi' ? 'Đã lưu vào bài học' : 'Saved to lesson'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>
                        {language === 'vi' ? 'Tải lên & Lưu vào bài học' : 'Upload & Save to Lesson'}
                      </span>
                    </>
                  )}
                </button>

                {/* Button 2: Send Audio to AI for Transcription & Lesson Generation */}
                <button
                  type="button"
                  onClick={() => handleProcessAudio({ skipTranscriptionIfPresent: false })}
                  disabled={isSavingAudioOnly || isAnalyzing}
                  className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isAnalyzing
                      ? language === 'vi'
                        ? 'Đang xử lý bằng AI...'
                        : 'Processing with AI...'
                      : audioStorageUrl
                      ? language === 'vi'
                        ? 'Nhận diện & Tạo bài học từ file đã lưu'
                        : 'Transcribe & Generate Lesson from Saved File'
                      : language === 'vi'
                      ? 'Nhận diện giọng nói & Tạo bài học AI'
                      : 'Transcribe & Generate AI Lesson'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

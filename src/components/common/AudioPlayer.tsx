import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  AlertCircle,
  Download,
  Loader2,
  Trash2,
  FileAudio,
} from 'lucide-react';
import { formatDuration, formatFileSize } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

export interface AudioPlayerProps {
  src?: string | null;
  blob?: Blob | null;
  file?: File | null;
  duration?: number;
  fileName?: string;
  fileSize?: number;
  size?: number;
  autoPlay?: boolean;
  isUploading?: boolean;
  onDelete?: () => void;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  blob: initialBlob,
  file: initialFile,
  duration: initialDuration,
  fileName,
  fileSize: propFileSize,
  size: propSize,
  autoPlay = false,
  isUploading = false,
  onDelete,
  className = '',
}) => {
  const { language } = useApp();
  const effectiveFileName =
    fileName || (language === 'vi' ? 'Bản ghi âm bài giảng' : 'Lecture Audio Recording');
  const fileSize = propFileSize ?? propSize;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // States strictly specified in PHẦN 6
  const [audioBlob, setAudioBlob] = useState<Blob | null>(initialBlob || null);
  const [audioFile, setAudioFile] = useState<File | null>(initialFile || null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioStorageUrl, setAudioStorageUrl] = useState<string | null>(
    src && !src.startsWith('blob:') ? src : null
  );
  const [audioDuration, setAudioDuration] = useState<number>(initialDuration || 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Extra playback controls
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // References to keep blob URLs alive across component re-renders
  const createdUrlRef = useRef<string | null>(null);
  const prevBlobRef = useRef<Blob | null>(null);

  // Manage Blob URL cleanly and revoke only when the blob reference changes or on unmount
  useEffect(() => {
    setAudioError(null);

    if (initialBlob) {
      setAudioBlob(initialBlob);
      // Only create a new object URL if it's actually a new Blob instance
      if (initialBlob !== prevBlobRef.current) {
        if (createdUrlRef.current) {
          URL.revokeObjectURL(createdUrlRef.current);
          createdUrlRef.current = null;
        }
        try {
          const url = URL.createObjectURL(initialBlob);
          createdUrlRef.current = url;
          prevBlobRef.current = initialBlob;
          setAudioPreviewUrl(url);
        } catch (err: any) {
          console.warn('Error creating Object URL from blob:', err);
          setAudioError(
            language === 'vi'
              ? 'Không thể tạo đường dẫn phát âm thanh từ tệp ghi.'
              : 'Could not create playback URL from recorded audio.'
          );
        }
      }
    } else {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
      prevBlobRef.current = null;
      setAudioBlob(null);
      setAudioPreviewUrl(null);
    }

    if (initialFile) {
      setAudioFile(initialFile);
    }

    if (src) {
      if (src.startsWith('blob:')) {
        setAudioPreviewUrl(src);
      } else {
        setAudioStorageUrl(src);
      }
    }

    if (initialDuration && initialDuration > 0) {
      setAudioDuration(initialDuration);
    }
  }, [initialBlob, initialFile, src, initialDuration, language]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
    };
  }, []);

  // Handle audio element events
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      // Chrome often returns Infinity for WebM recordings
      if (!isNaN(dur) && isFinite(dur) && dur > 0) {
        setAudioDuration(dur);
      } else if (initialDuration && initialDuration > 0) {
        setAudioDuration(initialDuration);
      }
      setAudioError(null);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      // Fallback duration if audio element was reporting Infinity initially
      if (audioRef.current.duration && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
        setAudioDuration(audioRef.current.duration);
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    setIsPlaying(false);
    setAudioError(
      language === 'vi'
        ? 'Không thể phát file âm thanh này. Trình duyệt có thể không hỗ trợ codec hoặc file đã bị xóa khỏi hệ thống.'
        : 'Cannot play this audio file. Your browser may not support the codec or the file was removed.'
    );
  };

  // Playback Controls
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Error playing audio:', err);
          setAudioError(
            language === 'vi'
              ? 'Trình duyệt chưa cho phép tự động phát. Hãy nhấn nút để nghe lại.'
              : 'Autoplay was blocked by the browser. Click Play to listen.'
          );
        });
    }
  };

  const handleRewind10 = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const handleForward10 = () => {
    if (!audioRef.current) return;
    const maxDur = audioDuration || audioRef.current.duration || 0;
    audioRef.current.currentTime = Math.min(maxDur, audioRef.current.currentTime + 10);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Active audio URL to play: Storage URL has priority for saved lessons, else preview Blob URL
  const activePlayUrl = audioStorageUrl || audioPreviewUrl || src || null;

  if (!activePlayUrl && !audioBlob) {
    return (
      <div className={`p-5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 ${className}`}>
        {language === 'vi' ? 'Chưa có file âm thanh ghi âm.' : 'No audio recording available.'}
      </div>
    );
  }

  const effectiveDuration = audioDuration || (audioRef.current?.duration || 0);

  return (
    <div
      className={`p-5 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3.5 ${className}`}
    >
      {/* Audio element with controls */}
      <audio
        ref={audioRef}
        src={activePlayUrl || undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileAudio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {effectiveFileName}
            </h4>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{formatDuration(effectiveDuration)}</span>
              {fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(fileSize)}</span>
                </>
              )}
              {isUploading && (
                <>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {language === 'vi' ? 'Đang lưu lên Storage...' : 'Uploading to Storage...'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Extra buttons: Download / Delete */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activePlayUrl && (
            <a
              href={activePlayUrl}
              download={
                effectiveFileName.endsWith('.webm') || effectiveFileName.endsWith('.mp3')
                  ? effectiveFileName
                  : `${effectiveFileName}.webm`
              }
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={language === 'vi' ? 'Tải file âm thanh về máy' : 'Download audio file'}
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title={language === 'vi' ? 'Xóa bản ghi âm này' : 'Delete this recording'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {audioError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">
              {language === 'vi' ? 'Lỗi phát file ghi âm' : 'Audio Playback Error'}
            </div>
            <div>{audioError}</div>
          </div>
        </div>
      )}

      {/* Progress timeline scrubber */}
      <div className="space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={effectiveDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={!activePlayUrl}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 px-0.5">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(effectiveDuration)}</span>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Play, Rewind 10, Forward 10 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRewind10}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            title={language === 'vi' ? 'Tua lùi 10 giây' : 'Rewind 10 seconds'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={isUploading}
            className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 active:scale-90 transition-all disabled:opacity-50"
            title={
              isPlaying
                ? language === 'vi'
                  ? 'Tạm dừng'
                  : 'Pause'
                : language === 'vi'
                ? 'Phát'
                : 'Play'
            }
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleForward10}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            title={language === 'vi' ? 'Tua tới 10 giây' : 'Forward 10 seconds'}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Speed Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300">
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => changePlaybackRate(rate)}
                className={`px-1.5 py-0.5 rounded-md transition-colors ${
                  playbackRate === rate
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white"
              title={
                isMuted
                  ? language === 'vi'
                    ? 'Bật âm'
                    : 'Unmute'
                  : language === 'vi'
                  ? 'Tắt tiếng'
                  : 'Mute'
              }
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              title={language === 'vi' ? 'Âm lượng' : 'Volume'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

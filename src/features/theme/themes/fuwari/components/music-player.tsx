import { useRouteContext } from "@tanstack/react-router";
import {
  Disc3,
  ListMusic,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { MusicTrack } from "@/features/config/site-config.schema";
import { cn } from "@/lib/utils";

const LS_KEY = "fuwari-music-player";

interface SavedState {
  trackIndex: number;
  volume: number;
}

function loadSaved(): SavedState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { trackIndex: 0, volume: 0.5 };
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const MusicPlayer = memo(function MusicPlayer() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const tracks: MusicTrack[] = siteConfig?.music ?? [];

  const [saved] = useState(loadSaved);
  const [currentIndex, setCurrentIndex] = useState(
    tracks.length > 0
      ? Math.min(saved.trackIndex, tracks.length - 1)
      : 0,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume] = useState(saved.volume);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedStateRef = useRef<SavedState>(saved);

  // Lazily create Audio element on first user interaction
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.volume = savedStateRef.current.volume;
      audioRef.current = audio;

      const onTimeUpdate = () => setCurrentTime(audio.currentTime);
      const onDurationChange = () => setDuration(audio.duration || 0);
      const onEnded = () => {
        if (currentIndex < tracks.length - 1) {
          loadTrack(currentIndex + 1, true);
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };
      const onError = () => setIsPlaying(false);

      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("durationchange", onDurationChange);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
    }
    return audioRef.current;
  }, [currentIndex, tracks.length]);

  const currentTrack = tracks[currentIndex];

  const saveState = useCallback(
    (index: number, vol: number) => {
      savedStateRef.current = { trackIndex: index, volume: vol };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(savedStateRef.current));
      } catch {
        // ignore
      }
    },
    [],
  );

  const loadTrack = useCallback(
    (index: number, play?: boolean) => {
      const audio = ensureAudio();
      if (!audio || !tracks[index]) return;

      audio.src = tracks[index].src;
      audio.load();

      if (play) {
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(false);
      }
      setCurrentTime(0);
      setDuration(0);
      setCurrentIndex(index);
      saveState(index, savedStateRef.current.volume);
    },
    [tracks, ensureAudio, saveState],
  );

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src) {
        loadTrack(currentIndex, true);
        return;
      }
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [ensureAudio, currentTrack, isPlaying, loadTrack, currentIndex]);

  const playNext = useCallback(() => {
    if (currentIndex < tracks.length - 1) {
      loadTrack(currentIndex + 1, true);
    }
  }, [currentIndex, tracks.length, loadTrack]);

  const playPrev = useCallback(() => {
    if (currentIndex > 0) {
      loadTrack(currentIndex - 1, true);
    }
  }, [currentIndex, loadTrack]);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const time = (Number(e.target.value) / 100) * audio.duration;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = Number(e.target.value) / 100;
    audio.volume = vol;
    saveState(savedStateRef.current.trackIndex, vol);
  }, [saveState]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.volume > 0) {
      audio.volume = 0;
      saveState(savedStateRef.current.trackIndex, 0);
    } else {
      audio.volume = 0.5;
      saveState(savedStateRef.current.trackIndex, 0.5);
    }
  }, [saveState]);

  const selectTrack = useCallback((index: number) => {
    setShowPlaylist(false);
    loadTrack(index, true);
  }, [loadTrack]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const vol = audioRef.current?.volume ?? volume;
  const VolumeIcon = vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2;

  // Empty state
  if (!tracks.length) {
    return (
      <div className="fuwari-card-base p-4">
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Music size={28} className="fuwari-text-50" />
          <p className="text-xs fuwari-text-50 text-center">
            暂无音乐
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fuwari-card-base overflow-hidden!">
      {/* Current track info */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Cover art */}
          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-(--fuwari-btn-regular-bg) flex items-center justify-center">
            {currentTrack?.cover ? (
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Disc3 size={24} className="fuwari-text-50" />
            )}
          </div>

          {/* Track info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium fuwari-text-90 truncate">
              {currentTrack?.title ?? "未选择歌曲"}
            </p>
            <p className="text-xs fuwari-text-50 truncate">
              {currentTrack?.artist ?? ""}
            </p>
          </div>

          {/* Playlist toggle */}
          {tracks.length > 1 && (
            <button
              type="button"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg shrink-0 transition-colors active:scale-90",
                showPlaylist
                  ? "text-(--fuwari-primary) bg-(--fuwari-btn-regular-bg)"
                  : "fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg)",
              )}
            >
              <ListMusic size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Playlist */}
      {showPlaylist && tracks.length > 1 && (
        <div className="max-h-40 overflow-y-auto border-t border-black/5 dark:border-white/10 mx-3">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              type="button"
              onClick={() => selectTrack(index)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md transition-colors",
                index === currentIndex
                  ? "text-(--fuwari-primary) bg-(--fuwari-btn-regular-bg)"
                  : "fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg)",
              )}
            >
              <span className="text-xs font-mono w-5 shrink-0 text-center fuwari-text-50">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">
                  {track.title}
                </p>
                <p className="text-[10px] fuwari-text-50 truncate">
                  {track.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 py-1">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progressPercent}
          onChange={seek}
          className="w-full h-1 appearance-none rounded-full bg-(--fuwari-btn-regular-bg) accent-(--fuwari-primary) cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--fuwari-primary) [&::-webkit-slider-thumb]:shadow-sm"
          aria-label="播放进度"
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between px-4 pb-1">
        <span className="text-[10px] fuwari-text-50 font-mono">
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] fuwari-text-50 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1 pb-3">
        <button
          type="button"
          onClick={toggleMute}
          className="h-8 w-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg) active:scale-90 transition-colors"
          aria-label="音量"
        >
          <VolumeIcon size={14} />
        </button>

        <button
          type="button"
          onClick={playPrev}
          disabled={currentIndex === 0}
          className="h-8 w-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg) active:scale-90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="上一首"
        >
          <SkipBack size={16} />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-(--fuwari-primary) text-white hover:opacity-90 active:scale-90 transition-all shadow-sm"
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={playNext}
          disabled={currentIndex >= tracks.length - 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg) active:scale-90 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="下一首"
        >
          <SkipForward size={16} />
        </button>

        <div className="w-20 hidden sm:block">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(vol * 100)}
            onChange={setVolume}
            className="w-full h-1 appearance-none rounded-full bg-(--fuwari-btn-regular-bg) accent-(--fuwari-primary) cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--fuwari-primary)"
            aria-label="音量调节"
          />
        </div>
      </div>
    </div>
  );
});

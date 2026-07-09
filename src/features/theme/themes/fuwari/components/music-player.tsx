import { useRouteContext } from "@tanstack/react-router";
import {
  Disc3,
  Headphones,
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
const LS_AUTOPLAY_KEY = "fuwari-music-autoplay";

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

function loadAutoplayPref(): boolean {
  try {
    const raw = localStorage.getItem(LS_AUTOPLAY_KEY);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return true; // default: autoplay on
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const MusicPlayer = memo(function MusicPlayer() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const tracks: MusicTrack[] = siteConfig?.music ?? [];

  const [saved] = useState(loadSaved);
  const [currentIndex, setCurrentIndex] = useState(
    tracks.length > 0 ? Math.min(saved.trackIndex, tracks.length - 1) : 0,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(saved.volume);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [autoplay, setAutoplay] = useState(loadAutoplayPref);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIndexRef = useRef(currentIndex);
  const tracksLengthRef = useRef(tracks.length);
  const volumeRef = useRef(saved.volume);

  const saveState = useCallback((index: number, vol: number) => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ trackIndex: index, volume: vol }),
      );
    } catch {
      // ignore
    }
  }, []);

  // Create Audio element on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Keep refs in sync (avoids stale closures in event listeners)
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    tracksLengthRef.current = tracks.length;
  }, [tracks.length]);

  // Sync volume to audio element on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volumeRef.current;
    }
  }, []);

  // Register event listeners (re-register on currentIndex/tracks.length change)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex < tracksLengthRef.current) {
        const track = tracks[nextIndex];
        if (track) {
          audio.src = track.src;
          audio.load();
          audio
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
          setCurrentTime(0);
          setDuration(0);
          setCurrentIndex(nextIndex);
          saveState(nextIndex, audio.volume);
        }
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

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [currentIndex, tracks.length, tracks, saveState]);

  const currentTrack = tracks[currentIndex];

  // Attempt autoplay when component mounts (if enabled)
  const autoplayAttemptedRef = useRef(false);
  useEffect(() => {
    if (!autoplay || autoplayAttemptedRef.current || !tracks.length) return;
    autoplayAttemptedRef.current = true;

    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Small delay to let the component settle, then try autoplay
    const timer = setTimeout(() => {
      if (audio.src !== currentTrack.src) {
        audio.src = currentTrack.src;
        audio.load();
      }
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Browser blocked autoplay — silently ignore
          setIsPlaying(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [autoplay, tracks.length, currentTrack]);

  const toggleAutoplay = useCallback(() => {
    setAutoplay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_AUTOPLAY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const loadTrack = useCallback(
    (index: number, play?: boolean) => {
      const audio = audioRef.current;
      if (!audio || !tracks[index]) return;

      audio.src = tracks[index].src;
      audio.load();

      if (play) {
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        setIsPlaying(false);
      }
      setCurrentTime(0);
      setDuration(0);
      setCurrentIndex(index);
      saveState(index, audio.volume);
    },
    [tracks, saveState],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!audio.src) {
        loadTrack(currentIndex, true);
        return;
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying, loadTrack, currentIndex]);

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
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    const pct = Number(e.target.value);
    const time = (pct / 100) * audio.duration;
    if (!Number.isFinite(time)) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolumeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const vol = Number(e.currentTarget.value) / 100;
      volumeRef.current = vol;
      const audio = audioRef.current;
      if (audio) audio.volume = vol;
    },
    [],
  );

  const commitVolume = useCallback(
    (
      e:
        | React.MouseEvent<HTMLInputElement>
        | React.TouchEvent<HTMLInputElement>,
    ) => {
      const vol = Number(e.currentTarget.value) / 100;
      setVolumeState(vol);
      saveState(currentIndexRef.current, vol);
    },
    [saveState],
  );

  const toggleMute = useCallback(() => {
    const cur = volumeRef.current;
    if (cur > 0) {
      volumeRef.current = 0;
      const audio = audioRef.current;
      if (audio) audio.volume = 0;
      setVolumeState(0);
      saveState(currentIndexRef.current, 0);
    } else {
      volumeRef.current = 0.5;
      const audio = audioRef.current;
      if (audio) audio.volume = 0.5;
      setVolumeState(0.5);
      saveState(currentIndexRef.current, 0.5);
    }
  }, [saveState]);

  const selectTrack = useCallback(
    (index: number) => {
      setShowPlaylist(false);
      loadTrack(index, true);
    },
    [loadTrack],
  );

  const progressPercent =
    duration > 0 && Number.isFinite(duration)
      ? (currentTime / duration) * 100
      : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Empty state
  if (!tracks.length) {
    return (
      <div className="fuwari-card-base p-4">
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Music size={28} className="fuwari-text-50" />
          <p className="text-xs fuwari-text-50 text-center">暂无音乐</p>
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
                <p className="text-xs font-medium truncate">{track.title}</p>
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

      {/* Controls — responsive layout */}
      {/* Mobile: two rows */}
      <div className="sm:hidden pb-3">
        <div className="flex items-center justify-center gap-1">
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
            {isPlaying ? (
              <Pause size={18} fill="white" />
            ) : (
              <Play size={18} fill="white" className="ml-0.5" />
            )}
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
        </div>

        <div className="flex items-center justify-center gap-2 px-4 mt-2">
          <button
            type="button"
            onClick={toggleMute}
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg) active:scale-90 transition-colors"
            aria-label="音量"
          >
            <VolumeIcon size={13} />
          </button>

          <div className="flex-1 max-w-32">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              defaultValue={Math.round(volume * 100)}
              onInput={handleVolumeInput}
              onMouseUp={commitVolume}
              onTouchEnd={commitVolume}
              className="w-full h-1 appearance-none rounded-full bg-(--fuwari-btn-regular-bg) accent-(--fuwari-primary) cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--fuwari-primary)"
              aria-label="音量调节"
            />
          </div>

          <button
            type="button"
            onClick={toggleAutoplay}
            className={cn(
              "h-7 w-7 shrink-0 flex items-center justify-center rounded-lg transition-colors active:scale-90",
              autoplay
                ? "text-(--fuwari-primary) bg-(--fuwari-btn-regular-bg)"
                : "fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg)",
            )}
            aria-label={autoplay ? "自动播放已开启" : "自动播放已关闭"}
            title={autoplay ? "自动播放已开启" : "自动播放已关闭"}
          >
            <Headphones size={13} />
          </button>
        </div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden sm:flex items-center justify-center gap-1 pb-3">
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
          {isPlaying ? (
            <Pause size={18} fill="white" />
          ) : (
            <Play size={18} fill="white" className="ml-0.5" />
          )}
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

        <div className="w-20">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            defaultValue={Math.round(volume * 100)}
            onInput={handleVolumeInput}
            onMouseUp={commitVolume}
            onTouchEnd={commitVolume}
            className="w-full h-1 appearance-none rounded-full bg-(--fuwari-btn-regular-bg) accent-(--fuwari-primary) cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--fuwari-primary)"
            aria-label="音量调节"
          />
        </div>

        <button
          type="button"
          onClick={toggleAutoplay}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg transition-colors active:scale-90",
            autoplay
              ? "text-(--fuwari-primary) bg-(--fuwari-btn-regular-bg)"
              : "fuwari-text-50 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg)",
          )}
          aria-label={autoplay ? "自动播放已开启" : "自动播放已关闭"}
          title={autoplay ? "自动播放已开启" : "自动播放已关闭"}
        >
          <Headphones size={14} />
        </button>
      </div>
    </div>
  );
});

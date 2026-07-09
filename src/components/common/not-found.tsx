import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { m } from "@/paraglide/messages";

/* ─── Mini-Game: 彩蛋收集 ─── */
const EGG_COLORS = [
  "bg-pink-400/30 hover:bg-pink-400/60",
  "bg-sky-400/30 hover:bg-sky-400/60",
  "bg-amber-400/30 hover:bg-amber-400/60",
  "bg-emerald-400/30 hover:bg-emerald-400/60",
  "bg-violet-400/30 hover:bg-violet-400/60",
];
const EGG_EMOJIS = ["🥚", "🐣", "🐥", "🥚", "🐣"];

function FloatingEgg({
  index,
  onCollect,
  collected,
}: {
  index: number;
  onCollect: () => void;
  collected: boolean;
}) {
  const positions = [
    { top: "12%", left: "8%" },
    { top: "18%", right: "12%" },
    { top: "55%", left: "5%" },
    { top: "65%", right: "8%" },
    { top: "80%", left: "50%" },
  ];
  const delays = [0, 200, 400, 600, 800];
  const pos = positions[index] ?? positions[0];
  const delay = delays[index] ?? 0;

  if (collected) return null;

  return (
    <button
      type="button"
      onClick={onCollect}
      className={`absolute z-10 w-8 h-8 md:w-10 md:h-10 rounded-full ${EGG_COLORS[index]} flex items-center justify-center text-sm transition-all duration-300 hover:scale-125 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2`}
      style={{
        ...pos,
        animationDelay: `${delay}ms`,
        animationDuration: "600ms",
      }}
      aria-label="Collect egg"
    >
      <span className="opacity-70 group-hover:opacity-100">
        {EGG_EMOJIS[index]}
      </span>
    </button>
  );
}

/* ─── Main Component ─── */
export function NotFound() {
  const navigate = useNavigate();
  const [collectedEggs, setCollectedEggs] = useState<Set<number>>(new Set());
  const [digitEmojis, setDigitEmojis] = useState<Record<number, string | null>>(
    {
      0: null,
      1: null,
      2: null,
    },
  );
  const [showCompletion, setShowCompletion] = useState(false);

  const handleCollect = useCallback((index: number) => {
    setCollectedEggs((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (next.size >= 5) {
        setTimeout(() => setShowCompletion(true), 400);
      }
      return next;
    });
  }, []);

  const handleDigitClick = useCallback((index: number) => {
    const emojis = [
      ["👻", "💀", "🛸", "👽"],
      ["🌀", "⭐", "✨", "🌈"],
      ["🔥", "💪", "⚡", "🎯"],
    ];
    const pool = emojis[index] ?? ["🤔"];
    setDigitEmojis((prev) => ({
      ...prev,
      [index]: pool[Math.floor(Math.random() * pool.length)],
    }));
    setTimeout(() => {
      setDigitEmojis((prev) => ({ ...prev, [index]: null }));
    }, 800);
  }, []);

  const allCollected = collectedEggs.size >= 5;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background relative overflow-hidden">
      {/* Completion overlay */}
      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 animate-in fade-in duration-300">
          <div className="text-center space-y-4 animate-in zoom-in-150 duration-500">
            <div className="text-5xl">🎉🐥🌈</div>
            <h3 className="text-xl font-serif font-medium">
              All eggs hatched!
            </h3>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-[0.3em] text-foreground border border-foreground/30 hover:border-foreground rounded-sm transition-all duration-300"
            >
              ✦ Go Home ✦
            </button>
          </div>
        </div>
      )}

      {/* Floating eggs */}
      {Array.from({ length: 5 }, (_, i) => (
        <FloatingEgg
          key={i}
          index={i}
          onCollect={() => handleCollect(i)}
          collected={collectedEggs.has(i)}
        />
      ))}

      <div className="space-y-8 animate-in fade-in duration-500 max-w-md relative z-10">
        {/* 404 Header */}
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/40">
            [ 404 — {m.not_found_title()} ]
          </p>

          {/* Interactive digits */}
          <div className="flex items-center justify-center gap-3">
            {["4", "0", "4"].map((d, i) => (
              <button
                key={`${d}-${i}`}
                type="button"
                onClick={() => handleDigitClick(i)}
                className="relative text-6xl md:text-8xl font-black font-mono tracking-tighter transition-transform duration-200 hover:scale-110 hover:text-primary/60 cursor-pointer select-none"
              >
                {digitEmojis[i] ? (
                  <span className="inline-block animate-in zoom-in-150 duration-300">
                    {digitEmojis[i]}
                  </span>
                ) : (
                  <span>{d}</span>
                )}
              </button>
            ))}
          </div>

          <h2 className="text-xl md:text-2xl font-serif font-medium text-foreground">
            {m.not_found_title()}
          </h2>
          <p className="text-sm text-muted-foreground/60 font-light leading-relaxed">
            {m.not_found_desc()}
          </p>
        </div>

        {/* Game hint */}
        <p className="text-[10px] font-mono text-muted-foreground/40">
          {allCollected
            ? "✨ All collected! ✨"
            : collectedEggs.size > 0
              ? `Collected ${collectedEggs.size}/5 eggs — keep looking around!`
              : "Found something colorful? Click it! 🥚"}
        </p>

        {/* Return button */}
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-foreground border border-border/30 hover:border-foreground/60 rounded-sm transition-all duration-300"
        >
          <span>✦</span>
          <span>{m.not_found_return()}</span>
          <span>✦</span>
        </button>
      </div>
    </div>
  );
}

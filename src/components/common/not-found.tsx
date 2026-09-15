import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { FileText, LayoutDashboard } from "lucide-react";
import { useCallback, useState } from "react";
import { StatusPage } from "@/components/common/status-page";
import { m } from "@/paraglide/messages";

export function NotFound() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const admin = /^\/admin(?:\/|$)/.test(pathname);
  return admin ? <AdminNotFound /> : <NotFoundGame />;
}

function AdminNotFound() {
  return (
    <StatusPage
      code="404"
      title={m.not_found_title()}
      description={m.admin_not_found_desc()}
      action={
        <>
          <Link to="/admin" className="fuwari-btn-primary">
            <LayoutDashboard size={18} aria-hidden="true" />
            {m.error_back_dashboard()}
          </Link>
          <Link to="/admin/posts" className="fuwari-btn-regular">
            <FileText size={18} aria-hidden="true" />
            {m.admin_sidebar_posts()}
          </Link>
        </>
      }
    />
  );
}

/* ─── Mini-game: collect the floating stars ─── */
const STAR_COLORS = [
  "bg-pink-400/30 hover:bg-pink-400/60",
  "bg-sky-400/30 hover:bg-sky-400/60",
  "bg-amber-400/30 hover:bg-amber-400/60",
  "bg-emerald-400/30 hover:bg-emerald-400/60",
  "bg-violet-400/30 hover:bg-violet-400/60",
];
const STAR_EMOJIS = ["⭐", "🌟", "✨", "⭐", "🌟"];
const STAR_POSITIONS = [
  { top: "12%", left: "8%" },
  { top: "18%", right: "12%" },
  { top: "55%", left: "5%" },
  { top: "65%", right: "8%" },
  { top: "80%", left: "50%" },
];
const STAR_DELAYS = [0, 200, 400, 600, 800];

function FloatingStar({
  index,
  onCollect,
  collected,
}: {
  index: number;
  onCollect: () => void;
  collected: boolean;
}) {
  if (collected) return null;
  return (
    <button
      type="button"
      onClick={onCollect}
      className={`absolute z-10 w-8 h-8 md:w-10 md:h-10 rounded-full ${STAR_COLORS[index]} flex items-center justify-center text-sm transition-all duration-300 hover:scale-150 hover:shadow-lg hover:shadow-current animate-in fade-in slide-in-from-bottom-2`}
      style={{
        ...STAR_POSITIONS[index],
        animationDelay: `${STAR_DELAYS[index]}ms`,
        animationDuration: "600ms",
      }}
      aria-label="Collect star"
    >
      <span className="opacity-80">{STAR_EMOJIS[index]}</span>
    </button>
  );
}

const DIGIT_EMOJIS = [
  ["👻", "💀", "🛸", "👽"],
  ["🌀", "⭐", "✨", "🌈"],
  ["🔥", "💪", "⚡", "🎯"],
];

function NotFoundGame() {
  const navigate = useNavigate();
  const [collectedStars, setCollectedStars] = useState<Set<number>>(new Set());
  const [digitEmojis, setDigitEmojis] = useState<Record<number, string | null>>({
    0: null,
    1: null,
    2: null,
  });
  const [showCompletion, setShowCompletion] = useState(false);

  const handleCollect = useCallback((index: number) => {
    setCollectedStars((prev) => {
      const next = new Set(prev);
      next.add(index);
      if (next.size >= 5) {
        setTimeout(() => setShowCompletion(true), 400);
      }
      return next;
    });
  }, []);

  const handleDigitClick = useCallback((index: number) => {
    const pool = DIGIT_EMOJIS[index] ?? ["🤔"];
    setDigitEmojis((prev) => ({
      ...prev,
      [index]: pool[Math.floor(Math.random() * pool.length)],
    }));
    setTimeout(() => {
      setDigitEmojis((prev) => ({ ...prev, [index]: null }));
    }, 800);
  }, []);

  const allCollected = collectedStars.size >= 5;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background relative overflow-hidden">
      {showCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 animate-in fade-in duration-300">
          <div className="text-center space-y-4 animate-in zoom-in-150 duration-500">
            <div className="text-5xl">🌟✨⭐</div>
            <h3 className="text-xl font-serif font-medium">
              All stars collected!
            </h3>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-[0.3em] text-foreground border border-foreground/30 hover:border-foreground rounded-sm transition-all duration-300"
            >
              ✦ Go Home ✦
            </button>
          </div>
        </div>
      )}

      {Array.from({ length: 5 }, (_, i) => (
        <FloatingStar
          key={i}
          index={i}
          onCollect={() => handleCollect(i)}
          collected={collectedStars.has(i)}
        />
      ))}

      <div className="space-y-8 animate-in fade-in duration-500 max-w-md relative z-10">
        <div className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/40">
            [ 404 — {m.not_found_title()} ]
          </p>

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

        <p className="text-[10px] font-mono text-muted-foreground/40">
          {allCollected
            ? "✨ All collected! ✨"
            : collectedStars.size > 0
              ? `Collected ${collectedStars.size}/5 stars — keep looking around!`
              : "See something sparkling? Click it! ⭐"}
        </p>

        <button
          type="button"
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

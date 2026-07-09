import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { m } from "@/paraglide/messages";

/* ─── Mini-Game: Hide & Seek Button ─── */
function useEscapeButton() {
  const [dodgeCount, setDodgeCount] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isShaking, setIsShaking] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const maxDodges = 4;

  const handleMouseEnter = useCallback(() => {
    if (dodgeCount >= maxDodges) return;
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const parentRect = btn.parentElement?.getBoundingClientRect() ?? {
      width: window.innerWidth,
      height: window.innerHeight,
      left: 0,
      top: 0,
    };

    // Move within parent bounds
    const maxX = parentRect.width - rect.width - 20;
    const maxY = parentRect.height - rect.height - 20;
    const newX = Math.max(0, Math.min(maxX, Math.random() * maxX));
    const newY = Math.max(0, Math.min(maxY, Math.random() * maxY));

    setPosition({ x: newX, y: newY });
    setIsShaking(true);
    setDodgeCount((c) => c + 1);
    setTimeout(() => setIsShaking(false), 300);
  }, [dodgeCount, maxDodges]);

  const style =
    dodgeCount < maxDodges
      ? ({
          position: "relative",
          left: position.x,
          top: position.y,
        } as React.CSSProperties)
      : undefined;

  const message =
    dodgeCount === 0
      ? null
      : dodgeCount < maxDodges
        ? `Nice try! (${dodgeCount}/${maxDodges})`
        : "Okay okay, you win! 🎉";

  return { buttonRef, handleMouseEnter, style, message, dodgeCount, isShaking };
}

/* ─── Interactive Digit ─── */
const DIGIT_REACTIONS = [
  ["🤔", "😅", "💀", "👻", "🫠"],
  ["😵‍💫", "🌀", "⭐", "✨", "🌟"],
  ["😤", "💪", "🔥", "⚡", "🎯"],
];

function InteractiveDigit({
  digit,
  index,
  onClick,
}: {
  digit: string;
  index: number;
  onClick: () => void;
}) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const reactions = DIGIT_REACTIONS[index] ?? ["🤔"];

  const handleClick = () => {
    onClick();
    const emoji = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction(emoji);
    setIsSpinning(true);
    setTimeout(() => {
      setReaction(null);
      setIsSpinning(false);
    }, 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative inline-block text-6xl md:text-8xl font-black font-mono tracking-tighter transition-all duration-200 hover:scale-110 hover:text-primary/60 cursor-pointer select-none"
      aria-label={`Click 404 digit ${digit}`}
    >
      <span
        className={`block transition-all duration-300 ${
          isSpinning ? "animate-in zoom-in-150 rotate-12" : ""
        }`}
      >
        {digit}
      </span>
      {reaction && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xl animate-in slide-in-from-top-2 fade-in zoom-in duration-300 pointer-events-none">
          {reaction}
        </span>
      )}
    </button>
  );
}

/* ─── Hidden Star ─── */
function HiddenStar({ onFound, id }: { onFound: () => void; id: number }) {
  const [found, setFound] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const positions = [
    { top: "15%", left: "10%" },
    { top: "70%", right: "15%" },
    { top: "40%", left: "75%" },
  ];

  const pos = positions[id] ?? positions[0];

  if (found) return null;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer select-none z-10"
      style={pos}
      onClick={() => {
        if (!found) {
          setFound(true);
          setShowTooltip(true);
          onFound();
          setTimeout(() => setShowTooltip(false), 1500);
        }
      }}
    >
      {/* Very subtle hint - tiny almost invisible dot */}
      <div
        className="w-3 h-3 rounded-full bg-primary/5 hover:bg-primary/30 hover:scale-150 transition-all duration-500"
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.opacity = "0.6";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.opacity = "0.2";
        }}
        style={{ opacity: 0.2 }}
      />
      {showTooltip && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-[9px] font-mono whitespace-nowrap text-primary/60 animate-in fade-in slide-in-from-top-1">
          ⭐ Found a star!
        </span>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function NotFound() {
  const navigate = useNavigate();
  const {
    buttonRef,
    handleMouseEnter,
    style: btnStyle,
    message: dodgeMessage,
    dodgeCount,
    isShaking,
  } = useEscapeButton();
  const [starsFound, setStarsFound] = useState(0);
  const [digitClicks, setDigitClicks] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const handleStarFound = useCallback(() => {
    setStarsFound((s) => {
      const next = s + 1;
      if (next >= 3) {
        setTimeout(() => setShowCelebration(true), 500);
      }
      return next;
    });
  }, []);

  const handleDigitClick = useCallback(() => {
    setDigitClicks((d) => d + 1);
    setGameStarted(true);
  }, []);

  const allStarsFound = starsFound >= 3;
  const buttonDefeated = dodgeCount >= 4;

  const canReturn = buttonDefeated || allStarsFound;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background relative overflow-hidden select-none">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Hidden Stars */}
      <HiddenStar onFound={handleStarFound} id={0} />
      <HiddenStar onFound={handleStarFound} id={1} />
      <HiddenStar onFound={handleStarFound} id={2} />

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-6 animate-in zoom-in-150 duration-700">
            <div className="text-6xl">🎉🌟✨</div>
            <h3 className="text-2xl font-serif font-medium">
              You found all the stars!
            </h3>
            <p className="text-sm text-muted-foreground/60">
              The portal home has appeared...
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-[0.3em] text-foreground border border-foreground/30 hover:border-foreground rounded-sm transition-all duration-500 animate-in slide-in-from-bottom-2"
            >
              ✦ Enter Portal ✦
            </button>
          </div>
        </div>
      )}

      <div className="space-y-10 animate-in fade-in duration-700 max-w-md relative z-10">
        {/* Interactive 404 Digits */}
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/40">
            [ 404 — {m.not_found_title()} ]
          </p>

          <div className="flex items-center justify-center gap-4">
            {["4", "0", "0"].map((d, i) => (
              <InteractiveDigit
                key={`${d}-${i}`}
                digit={d}
                index={i}
                onClick={handleDigitClick}
              />
            ))}
          </div>

          {/* Status messages */}
          <div className="h-6">
            {!gameStarted ? (
              <p className="text-[10px] font-mono text-muted-foreground/30 animate-pulse">
                Click the numbers... explore the page...
              </p>
            ) : digitClicks >= 5 && !allStarsFound ? (
              <p className="text-[10px] font-mono text-muted-foreground/40">
                Something sparkles in the corners... ✨
              </p>
            ) : null}
          </div>

          <h2 className="text-xl md:text-2xl font-serif font-medium tracking-tight text-foreground">
            {m.not_found_title()}
          </h2>
          <p className="text-sm text-muted-foreground/60 font-light leading-relaxed">
            {m.not_found_desc()}
          </p>
        </div>

        {/* Game progress */}
        <div className="flex items-center justify-center gap-6 text-[10px] font-mono">
          <span className="text-muted-foreground/40">
            Stars: {starsFound}/3
            {starsFound > 0 && (
              <span className="ml-1">{"⭐".repeat(starsFound)}</span>
            )}
          </span>
          <span className="text-muted-foreground/20">|</span>
          <span className="text-muted-foreground/40">
            Clicks: {digitClicks}
          </span>
        </div>

        {/* Return button with dodge mechanic */}
        <div
          className="relative flex items-center justify-center"
          style={{ minHeight: "80px" }}
        >
          <button
            ref={buttonRef}
            onClick={() => {
              if (canReturn) navigate({ to: "/" });
            }}
            onMouseEnter={handleMouseEnter}
            disabled={!canReturn}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5
              text-[10px] font-mono uppercase tracking-[0.3em]
              transition-all duration-300 rounded-sm
              ${
                canReturn
                  ? "text-foreground border border-foreground/30 hover:border-foreground cursor-pointer"
                  : "text-muted-foreground/30 border border-transparent cursor-default"
              }
              ${isShaking ? "animate-in shake-in duration-200" : ""}
              ${allStarsFound ? "animate-in zoom-in-125 shadow-lg shadow-primary/10" : ""}
            `}
            style={btnStyle}
          >
            <span>{canReturn ? "✦" : "·"}</span>
            <span>{canReturn ? m.not_found_return() : "Catch me..."}</span>
            <span>{canReturn ? "✦" : "·"}</span>
          </button>

          {/* Dodge message */}
          {dodgeMessage && !canReturn && (
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-muted-foreground/40 whitespace-nowrap animate-in fade-in">
              {dodgeMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

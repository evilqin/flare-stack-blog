import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "@/paraglide/messages";

const ASCII_ART = [
  "    ━━━━━━━━━━━━━━━",
  "    ┃              ┃",
  "    ┃  💫  ✨  🌟  ┃",
  "    ┃              ┃",
  "    ┃  LOST  IN    ┃",
  "    ┃  THE STARS   ┃",
  "    ┃              ┃",
  "    ┃  🌌  🚀  🌠  ┃",
  "    ┃              ┃",
  "    ━━━━━━━━━━━━━━━",
];

const TIPS = [
  "Tip: The page might have gone on an adventure without you.",
  "Tip: Try checking the URL for any typos.",
  "Tip: The content may have been moved to a new home.",
  "Tip: Sometimes pages just need a moment to themselves.",
  "Tip: You could try starting from the homepage instead.",
];

export function NotFound() {
  const navigate = useNavigate();
  const [currentTip, setCurrentTip] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onReturn = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="space-y-10 animate-in fade-in duration-700 relative z-10 max-w-lg">
        {/* ASCII Art Box */}
        <pre
          className="text-[8px] md:text-[10px] leading-[1.2] text-muted-foreground/30 font-mono tracking-wide select-none mx-auto"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            transition: "color 0.5s ease",
            color: isHovering ? "var(--primary)" : undefined,
            opacity: 0.6,
          }}
        >
          {ASCII_ART.join("\n")}
        </pre>

        {/* 404 indicator */}
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/40">
            [ 404 — {m.not_found_title()} ]
          </p>

          <h2 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-foreground/10 select-none">
            404
          </h2>

          <p className="text-sm md:text-base text-muted-foreground/60 font-light leading-relaxed max-w-sm mx-auto">
            {m.not_found_desc()}
          </p>
        </div>

        {/* Animated tip */}
        <div className="h-8 flex items-center justify-center">
          <p
            key={currentTip}
            className="text-[11px] font-mono text-muted-foreground/30 animate-in fade-in duration-500"
          >
            {TIPS[currentTip]}
          </p>
        </div>

        {/* Return button */}
        <button
          onClick={onReturn}
          className="group relative inline-flex items-center gap-3 px-6 py-3 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground/60 hover:text-foreground transition-all duration-500"
        >
          <span className="absolute inset-0 border border-border/20 rounded-sm group-hover:border-border/60 transition-colors duration-500" />
          <span className="relative flex items-center gap-3">
            <span className="opacity-40 group-hover:opacity-100 transition-opacity">
              ✦
            </span>
            <span>{m.not_found_return()}</span>
            <span className="opacity-40 group-hover:opacity-100 transition-opacity">
              ✦
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

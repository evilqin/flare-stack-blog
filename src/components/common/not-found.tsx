import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { m } from "@/paraglide/messages";

const TIPS = [
  "The page might have gone on an adventure without you.",
  "Try checking the URL for any typos.",
  "The content may have been moved to a new home.",
  "You could try starting from the homepage instead.",
];

function useRotatingTip() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  return TIPS[index];
}

export function NotFound() {
  const navigate = useNavigate();
  const tip = useRotatingTip();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full p-6 text-center bg-background">
      <div className="space-y-10 animate-in fade-in duration-700 max-w-md">
        {/* 404 */}
        <div className="space-y-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-muted-foreground/40">
            [ 404 ]
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight text-foreground/10 select-none">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.not_found_title()}
          </h2>
          <p className="text-sm text-muted-foreground/60 font-light leading-relaxed">
            {m.not_found_desc()}
          </p>
        </div>

        {/* Rotating tip */}
        <div className="h-8 flex items-center justify-center">
          <p
            key={tip}
            className="text-[11px] font-mono text-muted-foreground/30 animate-in fade-in duration-500"
          >
            {tip}
          </p>
        </div>

        {/* Return button */}
        <button
          onClick={() => navigate({ to: "/" })}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 hover:text-foreground border border-transparent hover:border-border/60 rounded-sm transition-all duration-500"
        >
          <span className="opacity-40 group-hover:opacity-100 transition-opacity">
            ✦
          </span>
          <span>{m.not_found_return()}</span>
          <span className="opacity-40 group-hover:opacity-100 transition-opacity">
            ✦
          </span>
        </button>
      </div>
    </div>
  );
}

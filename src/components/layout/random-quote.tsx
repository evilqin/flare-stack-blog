import { useRouteContext } from "@tanstack/react-router";
import { Quote, RefreshCw } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import type { Quote as QuoteType } from "@/features/config/site-config.schema";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const RandomQuote = memo(function RandomQuote() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const quotes: QuoteType[] = (siteConfig?.quotes as QuoteType[]) ?? [];

  // The server render and the first client render must agree, so both start
  // from the first quote; a random pick follows right after mounting. A
  // render-time Math.random() would trip React's hydration check.
  const [current, setCurrent] = useState<QuoteType | null>(
    () => quotes[0] ?? null,
  );

  useEffect(() => {
    if (quotes.length > 1) setCurrent(pickRandom(quotes));
  }, []);

  const refresh = useCallback(() => {
    setCurrent((previous) => {
      if (!quotes.length) return null;
      // Draw from everything but the current quote so consecutive clicks
      // always change the card. Filtering instead of retrying also keeps the
      // button working when several quotes share an id.
      const pool =
        quotes.length > 1
          ? quotes.filter((quote) => quote.id !== previous?.id)
          : quotes;
      return pool.length > 0 ? pickRandom(pool) : pickRandom(quotes);
    });
  }, [quotes]);

  if (!quotes.length || !current) {
    return (
      <div className="fuwari-card-base p-4">
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Quote size={20} className="fuwari-text-50" />
          <p className="text-xs fuwari-text-50 text-center">暂无语录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fuwari-card-base p-4 relative group">
      <div className="flex items-start gap-3">
        <Quote
          size={16}
          className="shrink-0 mt-0.5 text-(--fuwari-primary)"
          strokeWidth={1.5}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm fuwari-text-75 leading-relaxed break-words italic">
            &ldquo;{current.content}&rdquo;
          </p>
          <p className="text-xs fuwari-text-50 mt-2 text-right font-medium">
            — {current.author}
          </p>
        </div>
      </div>

      {/* Refresh button */}
      <button
        type="button"
        onClick={refresh}
        className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-lg fuwari-text-30 opacity-0 group-hover:opacity-100 hover:text-(--fuwari-primary) hover:bg-(--fuwari-btn-regular-bg) active:scale-90 transition-all"
        aria-label="换一条"
      >
        <RefreshCw size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
});

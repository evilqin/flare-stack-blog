import { Sparkles } from "lucide-react";
import { m } from "@/paraglide/messages";

/**
 * Sidebar card pointing at the standalone API Worker on ai.700214.xyz.
 *
 * The link is deliberately plain: the target subdomain carries its own
 * `X-Robots-Tag: noindex`, so this page stays indexable while the API site
 * does not. `nofollow` keeps crawlers from following the link at all.
 */
const API_URL = "https://ai.700214.xyz";

export function ApiPromo() {
  return (
    <a
      href={API_URL}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="fuwari-card-base p-4 block group transition-colors hover:bg-(--fuwari-btn-plain-bg-hover)"
    >
      <div className="flex items-start gap-3">
        <Sparkles
          size={16}
          className="shrink-0 mt-0.5 text-(--fuwari-primary)"
          strokeWidth={1.5}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium fuwari-text-90">
              {m.api_promo_title()}
            </span>
            <span className="text-[10px] leading-4 px-1.5 rounded-md bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)">
              NEW
            </span>
          </div>
          <p className="text-xs fuwari-text-50 mt-1.5 leading-relaxed">
            {m.api_promo_desc()}
          </p>
        </div>
      </div>
    </a>
  );
}

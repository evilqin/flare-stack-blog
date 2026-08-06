import { Link } from "@tanstack/react-router";
import { Check, Loader2, Music, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";

/**
 * 整蛊「人机验证」彩蛋。
 *
 * 复刻自经典玩法:伪装成真实的 Turnstile / reCAPTCHA 验证流程,让用户点过
 * 一轮又一轮(安全网关 → 二次校验 → 高级验证 → 进度66% → 进度98%),
 * 最后揭晓「你被耍了」—— 根本没有放行入口。
 */
type StageId = "cf-1" | "cf-2" | "google-1" | "google-2" | "google-3";

const STAGE_ORDER: StageId[] = [
  "cf-1",
  "cf-2",
  "google-1",
  "google-2",
  "google-3",
];

interface StageCopy {
  chip: string;
  title: string;
  subtitle: string;
  helper: string;
}

type Locale = "zh" | "en";

const STAGE_COPY: Record<Locale, Record<StageId, StageCopy>> = {
  zh: {
    "cf-1": {
      chip: "安全网关",
      title: "系统安全验证",
      subtitle: "检测到当前会话存在风险特征，请先完成一次行为验证。",
      helper: "通常仅需一次验证，完成后系统将自动处理后续流程。",
    },
    "cf-2": {
      chip: "二次校验",
      title: "继续验证",
      subtitle: "网络环境命中轻度风险标记，需要额外的 Turnstile 验证。",
      helper: "完成本轮后将自动切换到最终验证方式。",
    },
    "google-1": {
      chip: "高级验证",
      title: "图像识别校验",
      subtitle: "系统已切换为 Google reCAPTCHA，请按提示完成图像选择。",
      helper: "建议按图中要求精确选择，通常 1 至 2 组即可通过。",
    },
    "google-2": {
      chip: "进度 66%",
      title: "核验进行中",
      subtitle: "系统正在交叉校验识别结果，请继续完成下一组。",
      helper: "已接近完成，保持当前验证节奏即可。",
    },
    "google-3": {
      chip: "进度 98%",
      title: "最终校验",
      subtitle: "最后一轮验证正在执行，完成后将进行最终判定。",
      helper: "请耐心完成本轮，系统会自动给出结果。",
    },
  },
  en: {
    "cf-1": {
      chip: "Security Gateway",
      title: "Human Verification",
      subtitle:
        "Risk characteristics detected in the current session. Please complete one behavioral verification.",
      helper:
        "Usually a single verification is enough; the system handles the rest automatically.",
    },
    "cf-2": {
      chip: "Secondary Check",
      title: "Continue Verification",
      subtitle:
        "Mild risk marker hit by the network environment. Additional Turnstile verification required.",
      helper: "After this round, the final verification mode will load automatically.",
    },
    "google-1": {
      chip: "Advanced Verification",
      title: "Image Recognition",
      subtitle:
        "The system switched to Google reCAPTCHA. Please follow the prompt and select the matching images.",
      helper: "Precise selections usually pass within one or two groups.",
    },
    "google-2": {
      chip: "Progress 66%",
      title: "Review In Progress",
      subtitle:
        "The system is cross-checking recognition results. Please continue with the next group.",
      helper: "You are close to completion. Keep the current verification rhythm.",
    },
    "google-3": {
      chip: "Progress 98%",
      title: "Final Review",
      subtitle:
        "The last verification round is running and the final decision will follow.",
      helper:
        "Please finish this round. The system will show the final result automatically.",
    },
  },
};

const FINAL_COPY: Record<
  Locale,
  { title: string; lines: string[]; ps: string }
> = {
  zh: {
    title: "你被耍了",
    lines: [
      "恭喜你完成了五轮验证，但这里从来没有放行入口。",
      "你刚刚点过的每一个验证码，都只是流程演出的一部分。",
      "下次看到“验证进度 98%”，记得先怀疑一下页面动机。",
    ],
    ps: "这个页面没有任何真实功能，纯粹用来整蛊。",
  },
  en: {
    title: "You got played",
    lines: [
      "Congratulations on clearing five rounds, but there was never an allow path.",
      "Every CAPTCHA you just clicked was only part of the performance.",
      "Next time you see “Verification 98%”, question the page motive first.",
    ],
    ps: "This page has no real purpose — it exists purely to prank you.",
  },
};

const RICKROLL_URL = "https://www.bilibili.com/video/BV1GJ411x7h7/";

/** reCAPTCHA 风格的图像选择题:每组题目不同、目标物不同、干扰项也不同。 */
interface GridChallenge {
  target: string; // 要找的目标 emoji
  labelZh: string; // 中文题目里的名称
  labelEn: string; // 英文题目里的名称
  distractors: string[]; // 干扰物池
}

const GRID_CHALLENGES: GridChallenge[] = [
  {
    target: "🚦",
    labelZh: "红绿灯",
    labelEn: "traffic lights",
    distractors: ["🏠", "🚗", "🚌", "🌳", "☁️", "🚧", "🏢", "⚽", "🌊"],
  },
  {
    target: "🚌",
    labelZh: "公交车",
    labelEn: "buses",
    distractors: ["🚗", "🚕", "🚲", "🏠", "🌳", "🚦", "🏢", "☁️", "🏀"],
  },
  {
    target: "⛰️",
    labelZh: "山",
    labelEn: "mountains",
    distractors: ["🌳", "🌊", "🏠", "☁️", "🚗", "🦅", "⛵", "🏠", "🌻"],
  },
  {
    target: "🐱",
    labelZh: "猫",
    labelEn: "cats",
    distractors: ["🐶", "🐰", "🐦", "🐟", "🌳", "🏠", "⚽", "☁️", "🌙"],
  },
  {
    target: "🌳",
    labelZh: "树",
    labelEn: "trees",
    distractors: ["🏠", "🚗", "⛰️", "☁️", "🌊", "🏢", "🚦", "🌻", "🐦"],
  },
  {
    target: "🚗",
    labelZh: "汽车",
    labelEn: "cars",
    distractors: ["🚌", "🚕", "🚲", "🏠", "🌳", "🚦", "⚽", "☁️", "🚧"],
  },
];

/** 生成一张 3x3 的选择网格:目标物随机散落 targetCount 个,其余用干扰物填充。 */
function buildGrid(challenge: GridChallenge, targetCount: number): string[] {
  const positions = new Set<number>();
  while (positions.size < targetCount) {
    positions.add(Math.floor(Math.random() * 9));
  }
  const distractors = [...challenge.distractors].sort(
    () => Math.random() - 0.5,
  );
  const cells: string[] = [];
  let di = 0;
  for (let i = 0; i < 9; i++) {
    cells.push(positions.has(i) ? challenge.target : distractors[di++ % distractors.length]);
  }
  return cells;
}

type Phase = "idle" | "verifying" | "verified" | "done";

export function PrankVerification() {
  const locale: Locale = getLocale() === "en" ? "en" : "zh";
  const copy = STAGE_COPY[locale];
  const finalCopy = FINAL_COPY[locale];

  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cfChecked, setCfChecked] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stage = STAGE_ORDER[stageIndex];
  const isGoogleStage = stage.startsWith("google");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const advance = (delayMs = 600) => {
    timerRef.current = setTimeout(() => {
      if (stageIndex >= STAGE_ORDER.length - 1) {
        setPhase("done");
      } else {
        setStageIndex((i) => i + 1);
        setPhase("idle");
        setCfChecked(false);
        setSelectedCells(new Set());
      }
    }, delayMs);
  };

  const handleCfCheck = () => {
    if (cfChecked || phase !== "idle") return;
    setCfChecked(true);
    setPhase("verifying");
    timerRef.current = setTimeout(() => {
      setPhase("verified");
      advance(1100);
    }, 1300);
  };

  const handleGoogleVerify = () => {
    if (selectedCells.size === 0 || phase !== "idle") return;
    setPhase("verifying");
    timerRef.current = setTimeout(() => {
      setPhase("verified");
      advance(900);
    }, 1400);
  };

  // 三个 google 阶段分别用不同题目、不同目标数(2/3/4 个),网格只在本阶段内保持稳定
  const googleIndex = stageIndex >= 2 ? stageIndex - 2 : 0;
  const challenge = GRID_CHALLENGES[googleIndex % GRID_CHALLENGES.length];
  const targetCount = 2 + (googleIndex % 3);
  const grid = useMemo(
    () => buildGrid(challenge, targetCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [googleIndex],
  );

  return (
    <div className="mx-auto max-w-md px-6 py-10 md:py-16">
      {phase === "done" ? (
        <div className="border border-border/40 bg-background shadow-2xl text-center px-6 py-12 space-y-6">
          <div className="flex flex-col items-center gap-3">
            <ShieldAlert size={40} strokeWidth={1.25} className="text-destructive" />
            <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground">
              {finalCopy.title}
            </h1>
          </div>
          <div className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
            {finalCopy.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60">{finalCopy.ps}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={RICKROLL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <Music size={14} strokeWidth={1.5} />
              {locale === "zh" ? "Never Gonna Give You Up" : "Never Gonna Give You Up"}
            </a>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest border border-border/40 text-foreground hover:border-foreground/60 transition-colors"
            >
              {locale === "zh" ? "返回首页" : "Back home"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="border border-border/40 bg-background shadow-2xl overflow-hidden">
          {/* Stage header */}
          <div className="border-b border-border/30 px-6 py-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                {locale === "zh" ? "人机验证" : "Human Verification"}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/80 px-2 py-0.5 border border-border/40">
                {copy[stage].chip}
              </span>
            </div>
            <h2 className="text-xl font-serif font-medium text-foreground">
              {copy[stage].title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {copy[stage].subtitle}
            </p>
          </div>

          {/* Widget */}
          <div className="px-6 py-6 bg-muted/5 min-h-52 flex flex-col items-center justify-center gap-4">
            {isGoogleStage ? (
              <div className="w-full max-w-xs">
                {/* reCAPTCHA 风格的顶部条 */}
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-foreground/60">
                    reCAPTCHA
                  </span>
                  <span className="text-[10px] text-foreground/40">
                    🔊
                  </span>
                </div>
                <p className="text-center text-sm text-foreground/90 mb-3">
                  {locale === "zh"
                    ? `请选择所有包含${challenge.labelZh}的图片`
                    : `Select all images with ${challenge.labelEn}`}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {grid.map((emoji, i) => {
                    const selected = selectedCells.has(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={phase !== "idle"}
                        onClick={() =>
                          setSelectedCells((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i);
                            else next.add(i);
                            return next;
                          })
                        }
                        className={cn(
                          "aspect-square text-3xl flex items-center justify-center border bg-gradient-to-br from-muted/40 to-muted/10 transition-all",
                          selected
                            ? "border-foreground ring-1 ring-foreground/40"
                            : "border-border/40 hover:border-foreground/50",
                          phase !== "idle" && "opacity-60",
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleGoogleVerify}
                  disabled={selectedCells.size === 0 || phase !== "idle"}
                  className="mt-4 w-full py-3 text-xs font-mono font-bold uppercase tracking-widest bg-foreground text-background hover:opacity-90 disabled:opacity-30 disabled:hover:opacity-30 transition-opacity"
                >
                  {locale === "zh" ? "验证" : "Verify"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCfCheck}
                disabled={phase !== "idle"}
                className="w-full max-w-xs flex items-center gap-3 px-4 py-3.5 border border-border/50 bg-background hover:border-foreground/50 transition-colors"
              >
                <span
                  className={cn(
                    "w-6 h-6 shrink-0 flex items-center justify-center border",
                    cfChecked
                      ? "bg-foreground border-foreground"
                      : "border-border/60",
                  )}
                >
                  {cfChecked && <Check size={14} className="text-background" />}
                </span>
                <span className="text-sm text-foreground">
                  {locale === "zh" ? "我不是机器人" : "I'm not a robot"}
                </span>
              </button>
            )}
          </div>

          {/* Status bar */}
          <div className="border-t border-border/30 px-6 py-3 flex items-center gap-2">
            {phase === "verifying" ? (
              <>
                <Loader2 size={13} className="animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {locale === "zh" ? "正在核对识别结果..." : "Verifying..."}
                </span>
              </>
            ) : phase === "verified" ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                  {locale === "zh"
                    ? "✓ 验证通过，正在进行安全复核..."
                    : "✓ Verified, running security review..."}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/60">
                {copy[stage].helper}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

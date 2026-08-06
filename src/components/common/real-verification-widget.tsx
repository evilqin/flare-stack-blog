import { useEffect, useRef } from "react";

/**
 * 渲染真实的验证码组件(Turnstile / Google reCAPTCHA)。
 *
 * 与假组件不同,这里直接加载官方脚本、渲染官方 widget,因此观感上和真正的
 * 人机验证一模一样。整蛊的关键不在组件本身,而在"点完几轮依然不放行"。
 */

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";
const RECAPTCHA_SCRIPT_URL =
  "https://www.google.com/recaptcha/api.js?render=explicit&onload=__flareCaptchaReady";

declare global {
  interface Window {
    // turnstile 的类型已在 @/components/common/turnstile 中声明,这里不重复
    grecaptcha?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => number;
      reset: (id: number) => void;
    };
    __flareCaptchaReady?: () => void;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

let turnstileScriptPromise: Promise<void> | null = null;
let recaptchaScriptPromise: Promise<void> | null = null;

function ensureTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;
  turnstileScriptPromise = loadScript(TURNSTILE_SCRIPT_URL).catch((err) => {
    turnstileScriptPromise = null;
    throw err;
  });
  return turnstileScriptPromise;
}

function ensureRecaptcha(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (recaptchaScriptPromise) return recaptchaScriptPromise;
  recaptchaScriptPromise = new Promise((resolve) => {
    window.__flareCaptchaReady = () => resolve();
    loadScript(RECAPTCHA_SCRIPT_URL).catch(() => {
      // 网络受限时静默失败,调用方降级
      recaptchaScriptPromise = null;
      resolve();
    });
  });
  return recaptchaScriptPromise;
}

interface RealVerificationWidgetProps {
  type: "turnstile" | "recaptcha";
  siteKey: string;
  onSuccess: () => void;
  /** 每轮用一个不同的 key,确保切轮时 widget 重新挂载 */
  stageKey: number;
}

export function RealVerificationWidget({
  type,
  siteKey,
  onSuccess,
  stageKey,
}: RealVerificationWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let mounted = true;
    const container = containerRef.current;
    let widgetId: string | number | null = null;

    const init = async () => {
      try {
        if (type === "turnstile") {
          await ensureTurnstile();
          if (!mounted || !window.turnstile) return;
          widgetId = window.turnstile.render(container, {
            sitekey: siteKey,
            callback: () => onSuccess(),
            appearance: "interaction-only",
          });
        } else {
          await ensureRecaptcha();
          if (!mounted || !window.grecaptcha) return;
          widgetId = window.grecaptcha.render(container, {
            sitekey: siteKey,
            callback: () => onSuccess(),
          });
        }
      } catch {
        // 脚本加载失败:保持空容器,由调用方决定是否降级
      }
    };

    init();

    return () => {
      mounted = false;
      if (widgetId !== null) {
        if (type === "turnstile" && window.turnstile) {
          window.turnstile.remove(widgetId as string);
        } else if (type === "recaptcha" && window.grecaptcha) {
          window.grecaptcha.reset(widgetId as number);
        }
      }
    };
  }, [type, siteKey, onSuccess, stageKey]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}

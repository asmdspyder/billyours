interface AppLoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  inverse?: boolean;
  className?: string;
}

const dotSizes = {
  sm: "h-[0.25rem] w-[0.25rem]",
  md: "h-[0.3125rem] w-[0.3125rem]",
  lg: "h-[0.625rem] w-[0.625rem]",
};

const containerSizes = {
  sm: "gap-[0.125rem] h-[0.875rem]",
  md: "gap-[0.1875rem] h-[1.125rem]",
  lg: "gap-[0.375rem] h-[2rem]",
};

export function AppLoader({ size = "md", label, inverse = false, className = "" }: AppLoaderProps) {
  const color = inverse ? "bg-white" : "bg-[#2563eb]";

  return (
    <span className={`inline-flex items-center gap-[0.5rem] ${className}`} role="status" aria-live="polite">
      <span className={`relative inline-flex shrink-0 items-end justify-center ${containerSizes[size]}`}>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className={`${dotSizes[size]} ${color} rounded-full animate-bounce shadow-[0_0.125rem_0.375rem_rgba(37,99,235,0.28)]`}
            style={{
              animationDelay: `${dot * 120}ms`,
              animationDuration: "750ms",
              animationTimingFunction: "cubic-bezier(0.45, 0, 0.55, 1)",
            }}
            aria-hidden="true"
          />
        ))}
      </span>
      {label && (
        <span className={`text-[0.6875rem] font-black tracking-[0.01em] ${inverse ? "text-white" : "text-slate-600"}`}>
          {label}
        </span>
      )}
    </span>
  );
}

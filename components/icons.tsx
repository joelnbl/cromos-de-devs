type P = { className?: string };
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const GithubIcon = ({ className }: P) => (
  <svg {...base} width={18} height={18} className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
export const PackIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 3h12l-1 3 1 3v12H6V9l1-3-1-3z" />
    <path d="M6 9h12" />
  </svg>
);
export const AlbumIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 4v16M7 8h2M7 12h2M15 8h2M15 12h2" />
  </svg>
);
export const SwapIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
  </svg>
);
export const CromoIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="5" y="2.5" width="14" height="19" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M9 17h6" />
  </svg>
);
export const ShareIcon = ({ className }: P) => (
  <svg {...base} width={18} height={18} className={className}>
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
  </svg>
);

type SizedProps = { className?: string; size?: number; strokeWidth?: number };
const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const ChevronIcon = ({ dir = "right", size = 20 }: { dir?: "left" | "right"; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...line}>
    <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
  </svg>
);
export const CloseIcon = ({ size = 18 }: SizedProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...line}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const SearchIcon = ({ size = 18, strokeWidth = 2.4 }: SizedProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} {...line}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const ExchangeIcon = ({ size = 18, strokeWidth = 2.4 }: SizedProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} {...line}>
    <path d="M7 7h11l-3-3" />
    <path d="M17 17H6l3 3" />
  </svg>
);

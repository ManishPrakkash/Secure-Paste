/**
 * Category toggle component for pattern categories - Professional Design
 */

interface CategoryToggleProps {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  count: number;
  onChange: (name: string, enabled: boolean) => void;
}

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  cloud_keys: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  api_tokens: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  private_keys: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  passwords: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  network: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  pii: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export function CategoryToggle({
  name,
  label,
  description,
  enabled,
  count,
  onChange,
}: CategoryToggleProps) {
  const icon = CATEGORY_ICONS[name] || CATEGORY_ICONS.cloud_keys;

  return (
    <div className="group relative">
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-accent-primary/20 to-blue-600/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300`} />
      <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        <div className="relative p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {/* Icon */}
              <div className={`relative w-10 h-10 rounded-xl transition-all duration-500 flex items-center justify-center shadow-lg flex-shrink-0 ${enabled
                  ? 'bg-gradient-to-br from-accent-primary via-blue-500 to-blue-600'
                  : 'bg-gradient-to-br from-slate-700 to-slate-800'
                }`}>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent" />
                <div className="relative text-white">
                  {icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">{label}</h3>
                  {count > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-accent-primary/10 text-accent-primary font-semibold">
                      {count.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            </div>

            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => onChange(name, !enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 flex-shrink-0 ${enabled
                  ? 'bg-gradient-to-r from-accent-primary via-blue-500 to-blue-600 shadow-lg'
                  : 'bg-slate-700/80'
                }`}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-white/10" />
              <span
                className={`relative inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition-all duration-500 ${enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-100" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

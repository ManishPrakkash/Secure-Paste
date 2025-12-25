/**
 * Category toggle component for pattern categories
 */

interface CategoryToggleProps {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  count: number;
  onChange: (name: string, enabled: boolean) => void;
}

export function CategoryToggle({
  name,
  label,
  description,
  enabled,
  count,
  onChange,
}: CategoryToggleProps) {
  return (
    <div className="bg-bg-secondary rounded-lg border border-border-default">
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">{label}</h3>
            {count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-medium">
                {count.toLocaleString()} protected
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(name, !enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-accent-primary' : 'bg-border-strong'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  );
}

/**
 * Category toggle component for pattern categories
 */

import { useState } from 'react';

interface PatternDetail {
  name: string;
  pattern: string;
  maskedAs: string;
}

interface CategoryToggleProps {
  name: string;
  label: string;
  description: string;
  enabled: boolean;
  patterns: PatternDetail[];
  count: number;
  onChange: (name: string, enabled: boolean) => void;
}

export function CategoryToggle({
  name,
  label,
  description,
  enabled,
  patterns,
  count,
  onChange,
}: CategoryToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-default">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-primary">{label}</h3>
            <span className="text-xs text-text-muted">({patterns.length} patterns)</span>
            {count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-medium">
                {count.toLocaleString()} protected
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label={expanded ? 'Collapse patterns' : 'Expand patterns'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
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

      {/* Expanded Pattern List */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border-subtle">
          <div className="mt-3 space-y-3">
            {patterns.map((pattern, index) => (
              <div key={index} className="pl-4 border-l-2 border-border-default">
                <h4 className="text-xs font-medium text-text-primary">{pattern.name}</h4>
                <p className="text-xs text-text-secondary mt-1">
                  <span className="font-mono">{pattern.pattern}</span>
                </p>
                <p className="text-xs text-accent-secondary mt-1">
                  Masked as: <span className="font-mono">{pattern.maskedAs}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

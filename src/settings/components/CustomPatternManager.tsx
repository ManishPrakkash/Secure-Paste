/**
 * Custom Pattern Manager Component
 * Allows users to create, edit, and manage custom secret detection patterns
 */

import { useState, useEffect } from 'react';
import type { CustomPattern, PatternCategory, Severity } from '@/types/patterns';
import { sendMessage } from '@/utils/messaging';

interface CustomPatternManagerProps {
  onPatternsChange?: () => void;
}

export default function CustomPatternManager({ onPatternsChange }: CustomPatternManagerProps) {
  const [patterns, setPatterns] = useState<CustomPattern[]>([]);
  const [isAddingPattern, setIsAddingPattern] = useState(false);
  const [editingPattern, setEditingPattern] = useState<CustomPattern | null>(null);
  const [error, setError] = useState<string>('');

  // Load patterns on mount
  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const response = await sendMessage({ type: 'GET_CUSTOM_PATTERNS' });
      if (response.success) {
        setPatterns(response.data || []);
      }
    } catch (error) {
      console.error('[Custom Patterns] Error loading patterns:', error);
    }
  };

  const handleAddPattern = () => {
    setIsAddingPattern(true);
    setEditingPattern(null);
    setError('');
  };

  const handleEditPattern = (pattern: CustomPattern) => {
    setEditingPattern(pattern);
    setIsAddingPattern(false);
    setError('');
  };

  const handleDeletePattern = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pattern?')) {
      return;
    }

    try {
      const response = await sendMessage({
        type: 'DELETE_CUSTOM_PATTERN',
        data: { id },
      });

      if (response.success) {
        await loadPatterns();
        onPatternsChange?.();
      } else {
        setError(response.error || 'Failed to delete pattern');
      }
    } catch (error) {
      setError('Failed to delete pattern');
    }
  };

  const handleTogglePattern = async (id: string) => {
    try {
      const response = await sendMessage({
        type: 'TOGGLE_CUSTOM_PATTERN',
        data: { id },
      });

      if (response.success) {
        await loadPatterns();
        onPatternsChange?.();
      } else {
        setError(response.error || 'Failed to toggle pattern');
      }
    } catch (error) {
      setError('Failed to toggle pattern');
    }
  };

  const handleCloseForm = () => {
    setIsAddingPattern(false);
    setEditingPattern(null);
    setError('');
  };

  const handleSavePattern = async () => {
    await loadPatterns();
    setIsAddingPattern(false);
    setEditingPattern(null);
    setError('');
    onPatternsChange?.();
  };

  return (
    <div className="custom-pattern-manager">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Custom Patterns
        </h3>
        <button
          onClick={handleAddPattern}
          className="px-3 py-1.5 text-sm font-bold bg-[var(--accent-primary)] text-white rounded-md hover:bg-[#1ED760] active:scale-95 transition-all shadow-sm"
        >
          + Add Pattern
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-400">
          {error}
        </div>
      )}

      {(isAddingPattern || editingPattern) && (
        <PatternForm
          pattern={editingPattern}
          onSave={handleSavePattern}
          onCancel={handleCloseForm}
          onError={setError}
        />
      )}

      <div className="space-y-2">
        {patterns.length === 0 && !isAddingPattern && !editingPattern && (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No custom patterns yet. Click "Add Pattern" to create one.
          </div>
        )}

        {patterns.map((pattern) => (
          <PatternItem
            key={pattern.id}
            pattern={pattern}
            onEdit={handleEditPattern}
            onDelete={handleDeletePattern}
            onToggle={handleTogglePattern}
          />
        ))}
      </div>
    </div>
  );
}

interface PatternFormProps {
  pattern: CustomPattern | null;
  onSave: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

function PatternForm({ pattern, onSave, onCancel, onError }: PatternFormProps) {
  // Initialize replacement without brackets (strip them if editing existing pattern)
  const initialReplacement = pattern?.replacement
    ? pattern.replacement.replace(/[\[\]]/g, '')
    : '';

  const [name, setName] = useState(pattern?.name || '');
  const [pattern_input, setPatternInput] = useState(pattern?.regex || '');
  const [replacement, setReplacement] = useState(initialReplacement);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle replacement text with auto-uppercase and bracket formatting
  const handleReplacementChange = (value: string) => {
    // Remove any existing brackets
    let cleaned = value.replace(/[\[\]]/g, '');
    // Convert to uppercase
    cleaned = cleaned.toUpperCase();
    // Set the value (brackets will be added on submit)
    setReplacement(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onError('');

    // Validation
    if (!name.trim()) {
      onError('Pattern name is required');
      setIsSubmitting(false);
      return;
    }

    if (!pattern_input.trim()) {
      onError('Pattern is required');
      setIsSubmitting(false);
      return;
    }

    if (!replacement.trim()) {
      onError('Replacement placeholder is required');
      setIsSubmitting(false);
      return;
    }

    // Auto-detect if input is a keyword or regex
    let regex = pattern_input.trim();
    const flags = 'gi'; // Always use case-insensitive global matching

    // Check if it looks like a regex (contains special regex chars)
    const hasRegexChars = /[.*+?^${}()|[\]\\]/.test(regex);

    if (!hasRegexChars) {
      // It's a simple keyword - escape it for literal matching
      regex = regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Validate regex syntax
    try {
      new RegExp(regex, flags);
    } catch (err) {
      onError('Invalid pattern syntax');
      setIsSubmitting(false);
      return;
    }

    try {
      // Format replacement text with brackets
      const formattedReplacement = `[${replacement.trim()}]`;

      const patternData = {
        name: name.trim(),
        regex: regex,
        flags: flags,
        replacement: formattedReplacement,
        category: 'custom' as PatternCategory,
        severity: 'medium' as Severity,
        priority: 0,
        // When editing, preserve existing enabled state; when adding, default to true
        ...(pattern ? {} : { enabled: true }),
      };

      const response = pattern
        ? await sendMessage({
            type: 'UPDATE_CUSTOM_PATTERN',
            data: { id: pattern.id, updates: patternData },
          })
        : await sendMessage({
            type: 'ADD_CUSTOM_PATTERN',
            data: { pattern: patternData },
          });

      if (response.success) {
        onSave();
      } else {
        onError(response.error || 'Failed to save pattern');
      }
    } catch (error) {
      onError('Failed to save pattern');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg">
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        {pattern ? 'Edit Pattern' : 'Add New Pattern'}
      </h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Pattern Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Employee ID"
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-md text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Pattern *
          </label>
          <input
            type="text"
            value={pattern_input}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder="e.g., EMP-12345 or api_key_\\d{10}"
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-md text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            required
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Enter a keyword (e.g., "secret_key") or regex pattern (e.g., "EMP-\d{'{5}'}")
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Replacement Text *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm pointer-events-none">
              [
            </span>
            <input
              type="text"
              value={replacement}
              onChange={(e) => handleReplacementChange(e.target.value)}
              placeholder="EMP_ID"
              className="w-full pl-7 pr-7 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-md text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] uppercase"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm pointer-events-none">
              ]
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Text will be automatically formatted as [YOUR_TEXT] in uppercase
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm font-bold hover:bg-[#1ED760] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? 'Saving...' : pattern ? 'Update Pattern' : 'Add Pattern'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-md text-sm font-medium hover:bg-[var(--bg-elevated)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface PatternItemProps {
  pattern: CustomPattern;
  onEdit: (pattern: CustomPattern) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function PatternItem({ pattern, onEdit, onDelete, onToggle }: PatternItemProps) {
  return (
    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {pattern.name}
            </h4>
            {pattern.maskedCount !== undefined && pattern.maskedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-medium">
                {pattern.maskedCount.toLocaleString()} protected
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex gap-2 items-center">
              <span className="text-[var(--text-muted)] text-xs">Pattern:</span>
              <code className="text-[var(--text-primary)] font-mono text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">
                {pattern.regex}
              </code>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[var(--text-muted)] text-xs">Replacement:</span>
              <code className="text-[var(--accent-primary)] font-mono text-xs">
                {pattern.replacement}
              </code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => onToggle(pattern.id)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              pattern.enabled
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
            }`}
          >
            {pattern.enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={() => onEdit(pattern)}
            className="px-3 py-1 text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-elevated)] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(pattern.id)}
            className="px-3 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

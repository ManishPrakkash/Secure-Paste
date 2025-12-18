/**
 * Type definitions for secret detection patterns
 */

export type PatternCategory =
  | 'cloud_keys'
  | 'api_tokens'
  | 'private_keys'
  | 'passwords'
  | 'database'
  | 'network'
  | 'pii'
  | 'custom';

export type Severity = 'high' | 'medium' | 'low';

export interface SecretPattern {
  name: string;
  regex: RegExp;
  replacement: string | ((match: string) => string);
  category: PatternCategory;
  severity: Severity;
  priority?: number;
  optional?: boolean;
  custom?: boolean; // Mark if this is a user-defined pattern
}

/**
 * Custom pattern definition (stored in Chrome storage)
 */
export interface CustomPattern {
  id: string; // Unique ID (UUID or timestamp-based)
  name: string; // User-friendly name
  regex: string; // Regex pattern as string (will be compiled)
  flags?: string; // Regex flags (g, i, m, etc.)
  replacement: string; // Replacement placeholder (e.g., [CUSTOM_TOKEN])
  category: PatternCategory;
  severity: Severity;
  priority?: number;
  enabled: boolean;
  maskedCount?: number; // Number of times this pattern has masked secrets
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface PatternMatch {
  type: string;
  value: string;
  index: number;
  replacement: string;
  severity: Severity;
  category: PatternCategory;
  customPatternId?: string; // ID of custom pattern if this is a custom match
}

export interface DetectionResult {
  original: string;
  masked: string;
  matches: PatternMatch[];
}

export interface RestoreMap {
  [placeholder: string]: string;
}

export interface RestoreResult {
  masked: string;
  restoreMap: RestoreMap;
}

export type SecretPatterns = Record<string, SecretPattern>;

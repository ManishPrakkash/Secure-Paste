/**
 * Secure Paste - Developer Secret Detection Engine
 * Focus: Cloud credentials, tokens, private keys (NO country-specific PII)
 */

import type {
  SecretPattern,
  PatternMatch,
  CustomPattern,
} from '@/types/patterns';

/**
 * Interface for matched ranges to prevent overlapping detections
 */
interface MatchedRange {
  start: number;
  end: number;
}

/**
 * Interface for detection results
 */
interface DetectionResult {
  matches: PatternMatch[];
  count: number;
}

/**
 * Interface for masking results
 */
interface MaskResult {
  masked: string;
  original: string;
  replacements: number;
  categoryCounts: Record<string, number>;
  customPatternCounts?: Record<string, number>; // Custom pattern ID → count mapping
}

/**
 * Interface for restore map entries
 */
export interface RestoreMapEntry {
  type: string;
  original: string;
  replacement: string;
  numberedReplacement: string;
}

/**
 * Interface for restore-enabled masking results
 */
interface RestorableMaskResult {
  masked: string;
  original: string;
  restoreMap: RestoreMapEntry[];
  replacements: number;
}

// Secret Pattern Definitions
export const SECRET_PATTERNS: Record<string, SecretPattern> = {
  // ===== ☁️ CLOUD PROVIDER KEYS =====
  awsAccessKey: {
    name: 'AWS Access Key',
    regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    replacement: '[AWS_KEY]',
    category: 'cloud_keys',
    severity: 'high',
  },

  googleApiKey: {
    name: 'Google API Key',
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    replacement: '[GOOGLE_KEY]',
    category: 'cloud_keys',
    severity: 'high',
  },

  azureConnectionString: {
    name: 'Azure Connection String',
    regex:
      /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+;EndpointSuffix=[^'";\s]+/gi,
    replacement: '[AZURE_CONN]',
    category: 'cloud_keys',
    severity: 'high',
  },

  // ===== 🔑 API & SERVICE TOKENS =====
  githubToken: {
    name: 'GitHub Token',
    regex: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
    replacement: '[GITHUB_TOKEN]',
    category: 'api_tokens',
    severity: 'high',
  },

  gitlabToken: {
    name: 'GitLab Token',
    regex: /glpat-[A-Za-z0-9\-_]{20,}/g,
    replacement: '[GITLAB_TOKEN]',
    category: 'api_tokens',
    severity: 'high',
  },

  npmToken: {
    name: 'NPM Token',
    regex: /npm_[A-Za-z0-9]{30,}/g,
    replacement: '[NPM_TOKEN]',
    category: 'api_tokens',
    severity: 'high',
  },

  jwtToken: {
    name: 'JWT Token',
    regex: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,
    replacement: '[JWT]',
    category: 'api_tokens',
    severity: 'medium',
  },

  bearerToken: {
    name: 'Bearer Token',
    regex: /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
    replacement: 'Bearer [TOKEN]',
    category: 'api_tokens',
    severity: 'medium',
  },

  openaiApiKey: {
    name: 'OpenAI API Key',
    regex: /sk-[a-zA-Z0-9\-]{20,}/g,
    replacement: '[OPENAI_KEY]',
    category: 'api_tokens',
    severity: 'high',
  },

  stripeApiKey: {
    name: 'Stripe API Key',
    regex: /sk_(live|test)_[0-9a-zA-Z]{20,}/g,
    replacement: '[STRIPE_KEY]',
    category: 'api_tokens',
    severity: 'high',
  },

  sendgridApiKey: {
    name: 'SendGrid API Key',
    regex: /SG\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g,
    replacement: '[SENDGRID_KEY]',
    category: 'api_tokens',
    severity: 'high',
  },

  slackWebhook: {
    name: 'Slack Webhook',
    regex:
      /https:\/\/(?:hooks|api)\.slack\.com\/(?:services|webhook)\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    replacement: '[SLACK_WEBHOOK]',
    category: 'api_tokens',
    severity: 'high',
  },

  discordWebhook: {
    name: 'Discord Webhook',
    regex:
      /https:\/\/discord\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/g,
    replacement: '[DISCORD_WEBHOOK]',
    category: 'api_tokens',
    severity: 'high',
  },

  slackBotToken: {
    name: 'Slack Bot Token',
    regex: /xox[baprs]-[0-9]+-[0-9]+-[A-Za-z0-9]+/g,
    replacement: '[SLACK_TOKEN]',
    category: 'api_tokens',
    severity: 'high',
  },

  // ===== 🔐 PRIVATE KEYS & CERTIFICATES =====
  rsaPrivateKey: {
    name: 'RSA Private Key',
    regex:
      /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    replacement: '[RSA_KEY]',
    category: 'private_keys',
    severity: 'high',
  },

  ecPrivateKey: {
    name: 'EC Private Key',
    regex:
      /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
    replacement: '[EC_KEY]',
    category: 'private_keys',
    severity: 'high',
  },

  sshPrivateKey: {
    name: 'SSH Private Key',
    regex:
      /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
    replacement: '[SSH_KEY]',
    category: 'private_keys',
    severity: 'high',
  },

  pgpPrivateKey: {
    name: 'PGP Private Key',
    regex:
      /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]*?-----END PGP PRIVATE KEY BLOCK-----/g,
    replacement: '[PGP_KEY]',
    category: 'private_keys',
    severity: 'high',
  },

  genericPrivateKey: {
    name: 'Private Key',
    regex: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
    replacement: '[PRIVATE_KEY]',
    category: 'private_keys',
    severity: 'high',
  },

  certificate: {
    name: 'Certificate',
    regex: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
    replacement: '[CERTIFICATE]',
    category: 'private_keys',
    severity: 'medium',
  },

  // ===== 🔒 PASSWORDS & AUTHENTICATION =====
  passwordField: {
    name: 'Password Field',
    regex:
      /["']?(?:password|passwd|pwd)["']?\s*[=:]\s*(['"]?)([A-Za-z0-9!@#$%^&*_\-+=]{6,})\1/gi,
    replacement: (match: string): string => {
      const sepMatch = match.match(/\s*[=:]\s*/);
      if (sepMatch) {
        const sepIndex = match.indexOf(sepMatch[0]);
        const key = match.substring(0, sepIndex);
        const afterSep = match.substring(sepIndex + sepMatch[0].length);
        const quote =
          afterSep[0] === '"' || afterSep[0] === "'" ? afterSep[0] : '';
        return `${key}${sepMatch[0]}${quote}[PASS]${quote}`;
      }
      return match;
    },
    category: 'passwords',
    severity: 'high',
  },

  envPassword: {
    name: 'Env Password',
    regex:
      /(?:POSTGRES_PASSWORD|POSTGRES_USER|DB_PASSWORD|DB_USER|DB_PASS|MYSQL_PASSWORD|MYSQL_USER|JWT_SECRET|SESSION_SECRET|APP_SECRET)(\s*[=:]\s*)(['"]?)([^'"\s\n;]+)\2/g,
    replacement: (match: string): string => {
      const sepMatch = match.match(/\s*[=:]\s*/);
      if (!sepMatch) return match;

      const sepIndex = match.indexOf(sepMatch[0]);
      const key = match.substring(0, sepIndex);
      const afterSep = match.substring(sepIndex + sepMatch[0].length);
      const quote =
        afterSep[0] === '"' || afterSep[0] === "'" ? afterSep[0] : '';

      if (key.includes('PASSWORD') || key.includes('PASS'))
        return `${key}${sepMatch[0]}${quote}[PASS]${quote}`;
      if (key.includes('USER'))
        return `${key}${sepMatch[0]}${quote}[USER]${quote}`;
      return `${key}${sepMatch[0]}${quote}[SECRET]${quote}`;
    },
    category: 'passwords',
    severity: 'high',
    priority: -2,
  },

  mysqlCliPassword: {
    name: 'MySQL CLI Password',
    regex: /mysql\s+[^\n]*-p([A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+)/g,
    replacement: (match: string): string => {
      return match.replace(
        /-p[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+/,
        '-p[PASS]'
      );
    },
    category: 'passwords',
    severity: 'high',
    priority: 5,
  },

  curlBasicAuth: {
    name: 'Curl Basic Auth',
    regex: /curl\s+(?:-[a-zA-Z]+\s+)*-u\s+([A-Za-z0-9_-]+):([^\s]+)/g,
    replacement: (match: string): string => {
      const userMatch = match.match(/-u\s+([A-Za-z0-9_-]+):/);
      const user = userMatch ? userMatch[1] : '[USER]';
      return match.replace(/-u\s+[^\s]+/, `-u ${user}:[PASS]`);
    },
    category: 'passwords',
    severity: 'high',
    priority: 5,
  },

  basicAuthUrl: {
    name: 'Basic Auth URL',
    regex: /https?:\/\/[A-Za-z0-9_-]+:[^@\s]+@/g,
    replacement: (match: string): string => {
      const protocolEnd = match.indexOf('://');
      const protocol = match.substring(0, protocolEnd);
      const authStart = protocolEnd + 3;
      const authEnd = match.indexOf('@');
      const authPart = match.substring(authStart, authEnd);
      const [username, password] = authPart.split(':');

      let maskedPassword = '[PASS]';
      if (/^(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/.test(password)) {
        maskedPassword = '[GITHUB_TOKEN]';
      } else if (/^sk-[a-zA-Z0-9\-]{20,}/.test(password)) {
        maskedPassword = '[API_KEY]';
      }

      return `${protocol}://${username}:${maskedPassword}@`;
    },
    category: 'passwords',
    severity: 'medium',
    priority: -1,
  },

  // ===== 🗄️ DATABASE CONNECTIONS =====
  databaseUrl: {
    name: 'Database Connection URL',
    regex:
      /(postgres|postgresql|mysql|mongodb|redis):\/\/[^@\s"']+@[^\s"'\/]+/gi,
    replacement: (match: string): string => {
      const protocol = match.split('://')[0];
      return `${protocol}://[USER]:[PASS]@[HOST]`;
    },
    category: 'database',
    severity: 'high',
    priority: -3,
  },

  jdbcUrl: {
    name: 'JDBC URL',
    regex: /jdbc:(postgresql|mysql|oracle|sqlserver):\/\/[^\s"']+/gi,
    replacement: '[JDBC_URL]',
    category: 'database',
    severity: 'medium',
    priority: -10,
  },

  // ===== 🌐 NETWORK & ENDPOINTS =====
  fullUrl: {
    name: 'Full URL',
    regex:
      /https?:\/\/([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(:[0-9]+)?(\/[^\s"'<>)}\]]*)?/gi,
    replacement: '[URL]',
    category: 'network',
    severity: 'medium',
    priority: -5,
  },

  quotedDomain: {
    name: 'Quoted Domain',
    regex:
      /(["'])([a-z0-9]([a-z0-9-]*[a-z0-9])?\.){2,}(com|org|net|io|co|kr|jp|de|uk|local|internal)\1/gi,
    replacement: (match: string): string => {
      const quote = match[0];
      return `${quote}[DOMAIN]${quote}`;
    },
    category: 'network',
    severity: 'medium',
  },

  httpEndpoint: {
    name: 'HTTP Endpoint',
    regex:
      /(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+["']?(\/[^\s"']*)/gi,
    replacement: (match: string): string => {
      const methodMatch = match.match(
        /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/i
      );
      const method = methodMatch ? methodMatch[0] : 'GET';
      return `${method} [ENDPOINT]`;
    },
    category: 'network',
    severity: 'medium',
  },

  ipv4Address: {
    name: 'IPv4 Address',
    regex:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[IP]',
    category: 'network',
    severity: 'low',
  },

  // ===== 📧 PERSONAL INFORMATION (Optional) =====
  emailAddress: {
    name: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL]',
    category: 'pii',
    severity: 'low',
    optional: true,
  },
};

/**
 * Check if string is a known test pattern (whitelist)
 */
function isTestPattern(str: string): boolean {
  const testPatterns = [
    'AKIA0000000000000000',
    'sk-0000000000000000',
    'ghp_0000000000000000',
    '127.0.0.1',
    '0.0.0.0',
    'example@example.com',
  ];
  return testPatterns.some((pattern) => str === pattern);
}

/**
 * Calculate entropy of string
 */
export function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (let char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;

  for (let char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Check if string is high-entropy secret
 */
export function isHighEntropy(str: string, threshold: number = 4.5): boolean {
  return calculateEntropy(str) > threshold;
}

/**
 * Convert CustomPattern to SecretPattern (compile regex)
 */
function customPatternToSecretPattern(customPattern: CustomPattern): SecretPattern {
  return {
    name: customPattern.name,
    regex: new RegExp(customPattern.regex, customPattern.flags || 'g'),
    replacement: customPattern.replacement,
    category: customPattern.category,
    severity: customPattern.severity,
    priority: customPattern.priority || 0,
    custom: true,
  };
}

/**
 * Merge built-in patterns with custom patterns
 */
function mergePatterns(customPatterns?: CustomPattern[]): Record<string, SecretPattern> {
  const mergedPatterns: Record<string, SecretPattern> = { ...SECRET_PATTERNS };

  if (customPatterns && customPatterns.length > 0) {
    customPatterns.forEach((customPattern) => {
      // Only add enabled custom patterns
      if (customPattern.enabled) {
        mergedPatterns[customPattern.id] = customPatternToSecretPattern(customPattern);
      }
    });
  }

  return mergedPatterns;
}

/**
 * Detect secrets in text
 * @param text - Input text to scan
 * @param enabledCategories - Optional category filters
 * @param customPatterns - Optional custom patterns to include
 * @returns Detection results
 */
export function detectSecretPatterns(
  text: string,
  enabledCategories?: Record<string, boolean>,
  customPatterns?: CustomPattern[]
): DetectionResult {
  const matches: PatternMatch[] = [];
  const matchedRanges: MatchedRange[] = [];

  // Merge built-in and custom patterns
  const allPatterns = mergePatterns(customPatterns);

  const sortedPatterns = Object.entries(allPatterns).sort(
    ([, a], [, b]) => {
      return (a.priority || 0) - (b.priority || 0);
    }
  );

  function isOverlapping(start: number, end: number): boolean {
    return matchedRanges.some((range) => {
      return (
        (start >= range.start && start < range.end) ||
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );
    });
  }

  sortedPatterns.forEach(([key, pattern]) => {
    // Skip optional patterns (like PII) if not explicitly enabled
    if (pattern.optional && (!enabledCategories || !enabledCategories[pattern.category])) {
      return;
    }

    // Skip patterns whose category is disabled
    if (enabledCategories && enabledCategories[pattern.category] === false) {
      return;
    }

    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchedValue = match[0];
      const start = match.index;
      const end = start + matchedValue.length;

      if (isOverlapping(start, end)) continue;
      if (isTestPattern(matchedValue)) continue;

      const replacement =
        typeof pattern.replacement === 'function'
          ? pattern.replacement(matchedValue)
          : pattern.replacement;

      const matchData: PatternMatch = {
        type: pattern.name,
        value: matchedValue,
        index: start,
        replacement: replacement,
        category: pattern.category,
        severity: pattern.severity,
      };

      // Add customPatternId if this is a custom pattern
      if (pattern.custom && key.startsWith('custom_')) {
        matchData.customPatternId = key;
      }

      matches.push(matchData);
      matchedRanges.push({ start, end });
    }
  });

  matches.sort((a, b) => a.index - b.index);

  return {
    matches,
    count: matches.length,
  };
}

/**
 * Generate random alphanumeric ID (4 characters)
 */
function generateRandomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Mask secrets in text with random-numbered placeholders
 * @param text - Input text
 * @param enabledCategories - Optional category filters
 * @param customPatterns - Optional custom patterns to include
 * @returns Masked result
 */
export function maskSecretPatterns(
  text: string,
  enabledCategories?: Record<string, boolean>,
  customPatterns?: CustomPattern[]
): MaskResult {
  const results = detectSecretPatterns(text, enabledCategories, customPatterns);

  if (results.matches.length === 0) {
    return {
      masked: text,
      original: text,
      replacements: 0,
      categoryCounts: {},
      customPatternCounts: {},
    };
  }

  // Count matches by category and custom pattern ID
  const categoryCounts: Record<string, number> = {};
  const customPatternCounts: Record<string, number> = {};
  results.matches.forEach((match) => {
    const category = match.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    // Track custom pattern matches separately
    if (match.customPatternId) {
      customPatternCounts[match.customPatternId] =
        (customPatternCounts[match.customPatternId] || 0) + 1;
    }
  });

  let masked = text;
  let offset = 0;

  results.matches.forEach((match) => {
    const baseReplacement = match.replacement;

    // Extract ALL pattern labels (e.g., [AWS_KEY], [USER]:[PASS]@[HOST], [TEST-123])
    const labelMatches = baseReplacement.match(/\[([A-Z0-9_-]+)\]/g);

    let numberedReplacement = baseReplacement;

    if (labelMatches && labelMatches.length > 0) {
      // Replace each [LABEL] with [LABEL#xxxx]
      labelMatches.forEach((label) => {
        const randomId = generateRandomId();
        numberedReplacement = numberedReplacement.replace(
          label,
          label.replace(/\[([A-Z0-9_-]+)\]/, `[$1#${randomId}]`)
        );
      });
    }

    const start = match.index + offset;
    const end = start + match.value.length;

    masked =
      masked.substring(0, start) + numberedReplacement + masked.substring(end);
    offset += numberedReplacement.length - match.value.length;
  });

  return {
    masked,
    original: text,
    replacements: results.matches.length,
    categoryCounts,
    customPatternCounts,
  };
}

/**
 * Mask secrets with restore capability (Pro feature)
 * Uses random IDs for unique identification across sessions
 * @param text - Input text
 * @param enabledCategories - Optional category filters
 * @param customPatterns - Optional custom patterns to include
 * @returns Restorable masked result
 */
export function maskWithRestore(
  text: string,
  enabledCategories?: Record<string, boolean>,
  customPatterns?: CustomPattern[]
): RestorableMaskResult {
  const results = detectSecretPatterns(text, enabledCategories, customPatterns);

  if (results.matches.length === 0) {
    return {
      masked: text,
      original: text,
      restoreMap: [],
      replacements: 0,
    };
  }

  const restoreMap: RestoreMapEntry[] = [];
  let masked = text;
  let offset = 0;

  results.matches.sort((a, b) => a.index - b.index);

  results.matches.forEach((match) => {
    const baseReplacement = match.replacement;

    // Extract ALL pattern labels (e.g., [AWS_KEY], [USER]:[PASS]@[HOST], [TEST-123])
    const labelMatches = baseReplacement.match(/\[([A-Z0-9_-]+)\]/g);

    let numberedReplacement = baseReplacement;

    if (labelMatches && labelMatches.length > 0) {
      // Replace each [LABEL] with [LABEL#xxxx]
      labelMatches.forEach((label) => {
        const randomId = generateRandomId();
        numberedReplacement = numberedReplacement.replace(
          label,
          label.replace(/\[([A-Z0-9_-]+)\]/, `[$1#${randomId}]`)
        );
      });
    }

    restoreMap.push({
      type: match.type,
      original: match.value,
      replacement: baseReplacement,
      numberedReplacement: numberedReplacement,
    });

    const start = match.index + offset;
    const end = start + match.value.length;

    masked =
      masked.substring(0, start) + numberedReplacement + masked.substring(end);
    offset += numberedReplacement.length - match.value.length;
  });

  return {
    masked,
    original: text,
    restoreMap,
    replacements: results.matches.length,
  };
}

/**
 * Restore masked text to original using restore map
 * Handles both [AWS_KEY#q3q1] and AWS_KEY#q3q1 formats
 */
export function restoreFromMasked(
  maskedText: string,
  restoreMap: RestoreMapEntry[]
): string {
  if (!restoreMap || restoreMap.length === 0) {
    return maskedText;
  }

  let restored = maskedText;

  restoreMap.forEach((item) => {
    const numberedPattern = item.numberedReplacement;

    // Escape the pattern for regex
    const escapedPattern = numberedPattern.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    // Match with brackets: [AWS_KEY#q3q1]
    const regexWithBrackets = new RegExp(escapedPattern, 'g');
    restored = restored.replace(regexWithBrackets, item.original);

    // Also match without brackets: AWS_KEY#q3q1
    // Remove [ and ] from the pattern
    const patternWithoutBrackets = numberedPattern.replace(/^\[/, '').replace(/\]$/, '');
    const escapedPatternNoBrackets = patternWithoutBrackets.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
    const regexWithoutBrackets = new RegExp(escapedPatternNoBrackets, 'g');
    restored = restored.replace(regexWithoutBrackets, item.original);
  });

  return restored;
}

/**
 * Email parser registry.
 * Matches incoming emails to the correct parser by sender pattern.
 */

import type { EmailParser } from './_template';
import { grabParser } from './grab';
import { gojekParser } from './gojek';
import { shopeeParser } from './shopee';
import { bcaParser } from './bca';
import { mandiriParser } from './mandiri';
import { bniParser } from './bni';

/** All registered email parsers */
const parsers: EmailParser[] = [
  grabParser,
  gojekParser,
  shopeeParser,
  bcaParser,
  mandiriParser,
  bniParser,
];

/** Get all registered parsers */
export function getAllParsers(): EmailParser[] {
  return parsers;
}

/**
 * Find the parser that matches a given sender email address.
 * Returns the first matching parser, or null if no match.
 */
export function findParserForEmail(from: string): EmailParser | null {
  for (const parser of parsers) {
    for (const pattern of parser.senderPatterns) {
      if (pattern.test(from)) return parser;
    }
  }
  return null;
}

// Re-export types and helpers for convenience
export type { EmailParser } from './_template';
export { parseRupiahAmount, truncateSnippet, extractDate } from './_template';

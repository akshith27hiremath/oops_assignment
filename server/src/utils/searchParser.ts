/**
 * Search Query Parser
 * Parses natural language search queries for distance-based searches
 * Examples: "apples within 2km", "bananas near me", "groceries within 5 miles of me"
 */

export interface ParsedSearch {
  query: string;           // The actual search term (e.g., "apples")
  distance?: number;       // Distance in kilometers
  hasDistanceQuery: boolean;
}

/**
 * Parse natural language distance queries
 * Patterns matched:
 * - "within X km/kilometers/miles"
 * - "X km away"
 * - "near me"
 * - "nearby"
 */
export function parseDistanceQuery(searchQuery: string): ParsedSearch {
  if (!searchQuery || typeof searchQuery !== 'string') {
    return {
      query: '',
      hasDistanceQuery: false
    };
  }

  const originalQuery = searchQuery.trim().toLowerCase();
  let cleanQuery = originalQuery;
  let distance: number | undefined;
  let hasDistanceQuery = false;

  // Pattern 1: "within X km/kilometers" or "within X miles"
  const withinPattern = /within\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|m)/i;
  const withinMatch = originalQuery.match(withinPattern);
  if (withinMatch) {
    const value = parseFloat(withinMatch[1]);
    const unit = withinMatch[2].toLowerCase();

    // Convert to kilometers
    if (unit.startsWith('mile')) {
      distance = value * 1.60934; // miles to km
    } else if (unit === 'm') {
      distance = value / 1000; // meters to km
    } else {
      distance = value; // already in km
    }

    // Remove the distance part from query
    cleanQuery = originalQuery.replace(withinPattern, '').trim();
    hasDistanceQuery = true;
  }

  // Pattern 2: "X km away" or "X miles away"
  const awayPattern = /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?)\s+away/i;
  const awayMatch = originalQuery.match(awayPattern);
  if (awayMatch && !hasDistanceQuery) {
    const value = parseFloat(awayMatch[1]);
    const unit = awayMatch[2].toLowerCase();

    if (unit.startsWith('mile')) {
      distance = value * 1.60934;
    } else {
      distance = value;
    }

    cleanQuery = originalQuery.replace(awayPattern, '').trim();
    hasDistanceQuery = true;
  }

  // Pattern 3: "near me" or "nearby"
  const nearPattern = /\b(near(?:by)?(?:\s+me)?)\b/i;
  const nearMatch = originalQuery.match(nearPattern);
  if (nearMatch && !hasDistanceQuery) {
    // Default to 5km for "near me" queries
    distance = 5;
    cleanQuery = originalQuery.replace(nearPattern, '').trim();
    hasDistanceQuery = true;
  }

  // Pattern 4: "X km" or "X miles" (standalone)
  const standalonePattern = /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?)\b/i;
  const standaloneMatch = cleanQuery.match(standalonePattern);
  if (standaloneMatch && !hasDistanceQuery) {
    const value = parseFloat(standaloneMatch[1]);
    const unit = standaloneMatch[2].toLowerCase();

    if (unit.startsWith('mile')) {
      distance = value * 1.60934;
    } else {
      distance = value;
    }

    cleanQuery = cleanQuery.replace(standalonePattern, '').trim();
    hasDistanceQuery = true;
  }

  // Clean up common words that might be left over
  cleanQuery = cleanQuery
    .replace(/\b(of me|from me|around me)\b/gi, '')
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();

  return {
    query: cleanQuery || originalQuery, // fallback to original if cleaning removed everything
    distance,
    hasDistanceQuery
  };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

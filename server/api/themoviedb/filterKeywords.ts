import { getSettings } from '@server/lib/settings';

// Helper to get filtered keywords regex from settings
function getFilteredKeywordsRegex(): RegExp | null {
  let keywords = getSettings()
    .main?.filteredKeywords.split(',')
    .map((keyword: string) => keyword.trim());

  // Remove empty strings
  keywords = keywords.filter((kw: string) => kw.length > 0);

  // Escape regex special chars and join with |, match full words (word boundaries)
  const pattern = keywords
    .map((kw: string) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (!pattern) return null;
  return new RegExp(`\\b(${pattern})\\b`, 'i');
}

export function isBlockedByKeywords(title: string, overview: string): boolean {
  const regex = getFilteredKeywordsRegex();
  if (!regex) return false;
  // Replace all non-alphanumeric characters with space before filtering
  const cleanTitle = (title || '').replace(/[^a-zA-Z0-9 ]/g, ' ');
  const cleanOverview = (overview || '').replace(/[^a-zA-Z0-9 ]/g, ' ');
  return regex.test(cleanTitle) || regex.test(cleanOverview);
}

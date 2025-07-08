export function extractPlaceholderId(reference: string): number {
  const match = reference.match(/^ref\$(\d+)$/);
  return match ? parseInt(match[1], 10) : -1;
}

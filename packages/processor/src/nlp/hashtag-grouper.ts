/**
 * NLP Hashtag Grouper — Phase 4 stub.
 * Returns each hashtag as its own group until the Python microservice is wired in.
 */
export async function groupHashtags(hashtags: string[]): Promise<Map<string, string[]>> {
  const groups = new Map<string, string[]>();
  for (const tag of hashtags) {
    groups.set(tag, [tag]);
  }
  return groups;
}

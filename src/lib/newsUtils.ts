/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function extractNewsTopic(content?: string, hashtags?: string[]): string {
  if (hashtags && hashtags.length > 0) {
    const cleanTag = hashtags[0].replace(/^#/, "").trim();
    if (cleanTag.length > 1) return cleanTag;
  }

  if (content && content.trim()) {
    const firstLine = content.split("\n")[0].trim();
    const cleanText = firstLine
      .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
      .replace(/[^\w\s\u00C0-\u00FF]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText) {
      const words = cleanText.split(" ").slice(0, 5).join(" ");
      if (words.length > 2) return words;
    }
  }

  return "Notícias Gerais";
}

export function buildLineNewsUrl(topic: string): string {
  const cleanTopic = topic.trim() || "Notícias";
  const encoded = encodeURIComponent(cleanTopic);
  return `https://news.techl.com.br/?q=${encoded}&search=${encoded}&s=${encoded}&topic=${encoded}&autoSearch=true`;
}

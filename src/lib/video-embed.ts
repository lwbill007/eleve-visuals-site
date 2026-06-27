/** Convert a YouTube/Vimeo watch URL into an embeddable player URL. Returns null for direct files. */
export function toVideoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  if (/youtube\.com\/embed\//i.test(url)) return url;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

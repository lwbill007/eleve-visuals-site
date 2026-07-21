import {
  isVimeoUrl,
  isYouTubeUrl,
  vimeoEmbedUrl,
  youTubeEmbedUrl,
} from "@/lib/portfolio-utils";

export function PortfolioVideoEmbed({ url }: { url: string }) {
  const youtube = isYouTubeUrl(url) ? youTubeEmbedUrl(url) : null;
  const vimeo = isVimeoUrl(url) ? vimeoEmbedUrl(url) : null;
  const embed = youtube || vimeo;

  if (embed) {
    return (
      <div className="relative aspect-video overflow-hidden bg-charcoal">
        <iframe
          src={embed}
          title="Project video"
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-charcoal">
      <video src={url} controls playsInline className="h-full w-full object-cover" />
    </div>
  );
}

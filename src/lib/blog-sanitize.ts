import DOMPurify from "isomorphic-dompurify";

/**
 * Server-side HTML sanitizer for blog content.
 *
 * This is the primary defense against XSS in blog content. All blog HTML
 * is sanitized here before writing to the database. Client-side rendering
 * uses dangerouslySetInnerHTML trusting that DB content is already clean.
 *
 * SECURITY: Do not widen this allowlist without a security review.
 */

/** Tags allowed in blog content. */
const ALLOWED_TAGS = [
  // Text
  "p", "br", "span",
  // Headings (H2/H3 only — page H1 is the post title)
  "h2", "h3",
  // Inline formatting
  "strong", "em", "u", "s", "code", "mark", "sub", "sup",
  // Block
  "blockquote", "pre", "hr",
  // Lists
  "ul", "ol", "li",
  // Links
  "a",
  // Images
  "img", "figure", "figcaption",
  // Video
  "video", "source",
  // YouTube embeds (restricted to YouTube domains via post-processing)
  "iframe",
  // Tables
  "table", "thead", "tbody", "tr", "th", "td",
  // Divs for custom blocks (video embeds, callouts)
  "div",
];

/** Attributes allowed per tag. */
const ALLOWED_ATTR = [
  // Global
  "class", "id",
  // Links
  "href", "target", "rel",
  // Images
  "src", "alt", "title", "width", "height", "loading",
  // Iframes (YouTube)
  "allow", "allowfullscreen", "frameborder",
  // Video
  "controls", "muted", "autoplay", "loop", "preload", "poster", "type",
  // Data attributes for custom TipTap nodes
  "data-type", "data-video-id", "data-caption", "data-size",
  // Text alignment
  "data-text-align",
];

/** YouTube domains allowed in iframe src. */
const YOUTUBE_DOMAINS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

/**
 * Sanitizes blog HTML content for safe storage and rendering.
 * Call this in the Server Action before persisting to the database.
 */
export function sanitizeBlogContent(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target"],
  });

  // Post-sanitize: restrict iframe src to YouTube domains only
  return restrictIframeSrc(clean);
}

/**
 * Post-process: ensure all iframe src attributes point to YouTube only.
 * DOMPurify allows iframes, but we must constrain the src domain.
 */
function restrictIframeSrc(html: string): string {
  return html.replace(
    /<iframe\s[^>]*src=["']([^"']*)["'][^>]*>[\s\S]*?<\/iframe>/gi,
    (match, src: string) => {
      try {
        const url = new URL(src);
        if (YOUTUBE_DOMAINS.has(url.hostname)) {
          return match;
        }
      } catch {
        // malformed URL — strip it
      }
      return "";
    }
  );
}

/**
 * Strips all HTML tags and returns plain text.
 * Used to validate that published content is not empty (TipTap empty = "<p></p>").
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Media tags that count as non-empty content even without text. */
const MEDIA_TAG_PATTERN = /<(img|video|iframe)\s/i;

/**
 * Returns true if the HTML has meaningful content — either text or media elements.
 * Used to validate published posts aren't empty.
 */
export function hasContentOrMedia(html: string): boolean {
  return !!stripHtmlTags(html) || MEDIA_TAG_PATTERN.test(html);
}

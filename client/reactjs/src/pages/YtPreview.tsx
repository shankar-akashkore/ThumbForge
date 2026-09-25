import { useSearchParams } from "react-router-dom"
import { yt_html } from "../assets 2/assets"

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))

// Only thumbnails hosted on Cloudinary may be previewed
const isCloudinaryUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

export const YtPreview = () => {

  const [searchParams] = useSearchParams();

  const thumbnail_url = searchParams.get('thumbnail_url') || '';

  const title = searchParams.get('title') || '';

  const safe_url = isCloudinaryUrl(thumbnail_url) ? escapeHtml(thumbnail_url) : '';

  // Function replacers so "$&"-style patterns in user input aren't interpreted
  const new_html = yt_html.replace("%%THUMBNAIL_URL%%", () => safe_url).replace("%%TITLE%%", () => escapeHtml(title))

  return (
    <div className="fixed inset-0 z-[1000] h-screen w-screen bg-black">
      {/* sandbox without allow-same-origin: the preview's own scripts run, but can't reach this app or its cookies */}
      <iframe
        title="YouTube preview"
        srcDoc={new_html}
        sandbox="allow-scripts"
        className="block h-full w-full border-0"
        allowFullScreen
      />
    </div>
  )
}

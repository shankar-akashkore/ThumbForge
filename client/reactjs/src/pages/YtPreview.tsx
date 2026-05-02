import { useSearchParams } from "react-router-dom"
import { yt_html } from "../assets 2/assets"

export const YtPreview = () => {

  const [searchParams] = useSearchParams();

  const thumbnail_url = searchParams.get('thumbnail_url');

  const title = searchParams.get('title');

  const new_html = yt_html.replace("%%THUMBNAIL_URL%%", thumbnail_url!).replace("%%TITLE%%", title!)

  return (
    <div className="fixed inset-0 z-[1000] h-screen w-screen bg-black">
      <iframe
        title="YouTube preview"
        srcDoc={new_html}
        className="block h-full w-full border-0"
        allowFullScreen
      />
    </div>
  )
}

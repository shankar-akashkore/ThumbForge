import { useEffect, useState } from "react"
import { SoftBackdrop } from "../components/SoftBackdrop"
import { dummyThumbnails, type IThumbnail } from "../assets 2/assets"
import { image } from "motion/react-client"
import { useNavigate } from "react-router-dom"


export const MyGeneration = () => {

  const aspectRatioClassMap : Record<string, string> = {
    '16:9': 'aspect-video',
    '1:1': 'aspect-square',
    '9:16': 'aspect-[9/16]',
  }

  const navigate = useNavigate();

  const [thumbnails, setThumbnails] = useState<IThumbnail[]>([])

  const [loading, setLoading] = useState(false);

  const fetchThumbnails = async() => {
    setThumbnails(dummyThumbnails as unknown as IThumbnail[])
    setLoading(false);
  }

  const handleDownload = (image_url: string) => {
    window.open(image_url, '_blank');
  }

  const handleDelete = async (id: string) => {
    console.log(id)
  }

  useEffect(() => {
    fetchThumbnails();
  },[])

  return (
    <>
    <SoftBackdrop />
    <div className="mt-32 min-h-screen px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-200">My Generations</h1>
        <p className="text-sm text-zinc-400 mt-1">View and manage all your AI-generated thumbnail</p>
      </div>

      {/* loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({length: 6}).map((_,i) => (
            <div key={i} className="rounded-2xl bg-white/6 border border-white/10 animate-pulse h-[260px]" />

          ))}

        </div>
      )}

      {/* Empty state */}
      {!loading && thumbnails.length === 0 && (
        <div className="text-center py-24">
          <h3 className="text-lg font-semibold text-zinc-200">No Thumbnails yet</h3>
          <p className="text-sm text-zinc-400 mt-2">Generate your first thumbnail to see it here</p>
        </div>
      )}

      {/* Grid */}
      {!loading && thumbnails.length > 0 && (
        <div className="columns-1 sm:colums-2 lg:columns-3 2xl:columns-4 gap-8">
          {thumbnails.map((thumb: IThumbnail) => {
            const aspectClass = aspectRatioClassMap[thumb.aspect_ratio || '16:9'];

            return (
              <div key={thumb._id} onClick={() => navigate(`/generate/${thumb._id}`)} className="mb-8 group relative cursor-pointer rounded-2xl bg-white/6 border border-white/10 transition shadow-xl break-inside-avoid">

                <div className={`relative overflow-hidden rounded-t-2xl ${aspectClass} bg-black`}>
                  {thumb.image_url ? (
                    <img src={thumb.image_url} alt={thumb.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                      {thumb.isGenerating ? 'Generating...' : 'No Image'}
                    </div>
                  )}

                  {thumb.isGenerating && 
                  <div className="absolute inset-0 bg-black/50 flex-center justify-center text-sm font-medium text-white">Generating....</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
    </>
  )
}

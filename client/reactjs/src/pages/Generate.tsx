import { useParams } from "react-router-dom"
import { useState } from "react";
import type { IThumbnail } from "../assets 2/assets";
import { SoftBackdrop } from "../components/SoftBackdrop";


export const Generate = () => {
  const {id} = useParams();
  const [title, setTitle] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('');

  const [thumbnail, setThumbnail] = useState<IThumbnail | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
    <SoftBackdrop />
    <div className="pt-24 min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8">
           {/* Left side  */}
          <div className={`space-y-6 ${id && 'pointer-events-none'}`}>
            <div className="p-6 rounded-2xl bg-white/8 border border-white/12 shadow-xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 mb-1">Create Your Thumbnail</h2>
                <p className="text-sm text-zinc-400">Describe your vision and let AI bring it to life</p>
              </div>
            </div>
          </div>


          {/* Right side */}
          <div></div>
        </div>
      </main>
    </div>
    </>
  )
}

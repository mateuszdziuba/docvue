import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"

interface PhotoComparisonProps {
  beforePath: string | null
  afterPath: string | null
}

export function PhotoComparison({ beforePath, afterPath }: PhotoComparisonProps) {
  const isDisabled = !beforePath || !afterPath
  
  if (isDisabled) {
    return (
      <button 
        disabled 
        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 font-medium rounded-xl cursor-not-allowed border border-gray-200 dark:border-gray-700"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Porównaj efekty (Wymaga obu zdjęć)
      </button>
    )
  }

  const beforeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${beforePath}`
  const afterUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${afterPath}`

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Porównaj efekty (Suwak)
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-full p-0 bg-transparent border-none shadow-none overflow-hidden">
        <DialogTitle className="sr-only">Porównanie efektów</DialogTitle>
        <div className="flex items-center justify-center">
            <div className="relative aspect-square h-[70vh] w-auto max-w-full bg-black/50 rounded-lg overflow-hidden shadow-2xl">
                <ReactCompareSlider
                    itemOne={<ReactCompareSliderImage src={beforeUrl} alt="Przed" style={{ objectFit: 'contain' }} />}
                    itemTwo={<ReactCompareSliderImage src={afterUrl} alt="Po" style={{ objectFit: 'contain' }} />}
                    className="w-full h-full"
                />
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-sm font-medium pointer-events-none">
                PRZED
                </div>
                <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-purple-600/80 backdrop-blur-md rounded-full text-white text-sm font-medium pointer-events-none">
                PO
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

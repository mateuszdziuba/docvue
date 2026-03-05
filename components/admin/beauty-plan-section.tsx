import { createClient } from '@/lib/supabase/server'
import { EditBeautyPlanDialog } from './edit-beauty-plan-dialog'
import { ShareBeautyPlanButton } from './share-beauty-plan-button'
import { DeleteBeautyPlanButton } from './delete-beauty-plan-button'

interface BeautyPlanSectionProps {
  clientId: string
  salonId: string
}

export async function BeautyPlanSection({ clientId, salonId }: BeautyPlanSectionProps) {
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from('beauty_plans')
    .select(`
      *,
      products:beauty_plan_products (*)
    `)
    .eq('client_id', clientId)
    .single()

  const morningProducts = plan?.products?.filter((p: any) => p.time_of_day === 'morning') || []
  const eveningProducts = plan?.products?.filter((p: any) => p.time_of_day === 'evening') || []

  // Calculate total costs
  const calculateTotal = (products: any[]) => 
    products.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0)

  const morningTotal = calculateTotal(morningProducts)
  const eveningTotal = calculateTotal(eveningProducts)
  const totalCost = morningTotal + eveningTotal

  if (!plan) {
    return (
      <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Brak Beauty Planu</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Ten klient nie ma jeszcze spersonalizowanego planu pielęgnacyjnego.
          </p>
        </div>
        <EditBeautyPlanDialog clientId={clientId} salonId={salonId} />
      </div>
    )
  }

  const renderProductList = (products: any[]) => {
    if (products.length === 0) return <p className="text-sm text-muted-foreground italic">Brak dodanych produktów</p>
    
    return (
      <div className="space-y-3 mt-4">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-colors group">
            <div className="flex items-center gap-3 w-full max-w-[calc(100%-80px)]">
              {product.image_url ? (
                  <div className="w-10 h-10 rounded-md border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                     <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </div>
              ) : (
                  <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                     <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                     </svg>
                  </div>
              )}
              
              <div className="truncate pr-2">
                {product.url ? (
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-foreground hover:text-emerald-500 transition-colors flex items-center gap-1.5 truncate">
                    <span className="truncate">{product.name}</span>
                    <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <span className="font-medium text-sm text-foreground truncate block">{product.name}</span>
                )}
                {product.usage_description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={product.usage_description}>
                    {product.usage_description}
                  </p>
                )}
              </div>
            </div>
            
            {product.price && (
              <span className="text-sm font-bold opacity-80 whitespace-nowrap shrink-0">
                {Number(product.price).toFixed(2)} zł
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-inner shrink-0">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
             </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Beauty Plan</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
               Ostatnia aktualizacja: {new Date(plan.updated_at).toLocaleDateString('pl-PL')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:justify-end">
          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto mb-2 sm:mb-0 sm:mr-2">
             <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Całkowity koszt planu</span>
             <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
               {totalCost.toFixed(2)} zł
             </span>
          </div>
          <EditBeautyPlanDialog 
            clientId={clientId} 
            salonId={salonId}
            planId={plan.id}
            initialMorningDesc={plan.morning_description || ''}
            initialEveningDesc={plan.evening_description || ''}
            initialMorningProducts={morningProducts}
            initialEveningProducts={eveningProducts}
            trigger={
              <button className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                 </svg>
                 Edytuj
              </button>
            }
          />
          <ShareBeautyPlanButton planId={plan.id} />
          <DeleteBeautyPlanButton planId={plan.id} />
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-px bg-border/50">
        {/* Morning */}
        <div className="bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10 p-6">
          <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
             </div>
             <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">Rano</h3>
             {morningTotal > 0 && (
               <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                 {morningTotal.toFixed(2)} zł
               </span>
             )}
          </div>
          
          <div className="prose prose-sm dark:prose-invert text-muted-foreground whitespace-pre-wrap">
            {plan.morning_description || <span className="italic opacity-50">Brak wskazówek</span>}
          </div>
          
          {renderProductList(morningProducts)}
        </div>

        {/* Evening */}
        <div className="bg-gradient-to-b from-indigo-50/50 to-background dark:from-indigo-950/10 p-6">
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
             </div>
             <h3 className="text-base font-bold text-indigo-900 dark:text-indigo-100">Wieczór</h3>
             {eveningTotal > 0 && (
               <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100/50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                 {eveningTotal.toFixed(2)} zł
               </span>
             )}
          </div>

          <div className="prose prose-sm dark:prose-invert text-muted-foreground whitespace-pre-wrap">
            {plan.evening_description || <span className="italic opacity-50">Brak wskazówek</span>}
          </div>

          {renderProductList(eveningProducts)}
        </div>
      </div>
    </div>
  )
}

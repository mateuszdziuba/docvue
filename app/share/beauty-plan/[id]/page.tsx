import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ExternalLink, ShoppingCart } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('beauty_plans')
    .select('clients(name)')
    .eq('id', id)
    .single()

  if (!plan) {
      return { title: 'Błąd - Nie znaleziono planu | Docvue' }
  }

  const clientData = plan.clients as any
  const clientName = Array.isArray(clientData) ? clientData[0]?.name : clientData?.name

  return {
    title: `Twój Plan Pielęgnacyjny${clientName ? ` - ${clientName}` : ''} | Docvue`,
    description: 'Bądź piękna każdego dnia dzięki wyselekcjonowanej pielęgnacji.',
  }
}

export default async function SharedBeautyPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('beauty_plans')
    .select(`
      *,
      clients(name),
      salons(name),
      products:beauty_plan_products (*)
    `)
    .eq('id', id)
    .single()

  if (error || !plan) {
    if (error) console.error('Share page error:', error);
    return notFound()
  }

  const morningProducts = plan.products?.filter((p: any) => p.time_of_day === 'morning') || []
  const eveningProducts = plan.products?.filter((p: any) => p.time_of_day === 'evening') || []

  // Calculate total costs
  const calculateTotal = (products: any[]) => 
    products.reduce((acc, p) => acc + (parseFloat(p.price) || 0), 0)

  const morningTotal = calculateTotal(morningProducts)
  const eveningTotal = calculateTotal(eveningProducts)
  const totalCost = morningTotal + eveningTotal

  const clientData = plan.clients as any
  const clientName = Array.isArray(clientData) ? clientData[0]?.name : clientData?.name

  const salonData = plan.salons as any
  const salonName = Array.isArray(salonData) ? salonData[0]?.name : salonData?.name

  const renderProduct = (product: any, index: number) => {
     return (
        <div key={product.id} className="group flex flex-col sm:flex-row gap-5 p-5 bg-background border border-border/60 hover:border-emerald-500/30 rounded-2xl shadow-sm transition-all duration-300">
           {/* Image Frame */}
           <div className="w-full sm:w-28 h-28 sm:h-auto rounded-xl bg-muted/30 border border-border/50 overflow-hidden shrink-0 flex items-center justify-center p-2">
              {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform transition-transform duration-500 group-hover:scale-110" />
              ) : (
                  <div className="text-muted-foreground/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                         <ShoppingCart className="w-5 h-5 text-emerald-500" />
                      </div>
                  </div>
              )}
           </div>

           {/* Details */}
           <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-start justify-between gap-4 mb-2">
                 <div>
                    <span className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-1 block opacity-80">Krok {index + 1}</span>
                    <h4 className="text-base font-bold text-foreground">{product.name}</h4>
                 </div>
                 {product.price && (
                    <div className="text-right shrink-0">
                       <span className="block text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          {Number(product.price).toFixed(2)} zł
                       </span>
                    </div>
                 )}
              </div>
              
              {product.usage_description && (
                 <p className="text-sm text-muted-foreground/90 mt-1 mb-4 leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/40">
                    <span className="font-medium text-foreground text-xs uppercase tracking-wider block mb-1">Mój tip:</span>
                    {product.usage_description}
                 </p>
              )}

              <div className="mt-auto pt-2">
                 {product.url ? (
                    <a 
                       href={product.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-foreground hover:bg-emerald-600 px-4 py-2 rounded-full transition-colors"
                    >
                       Kup produkt <ExternalLink className="w-3 h-3" />
                    </a>
                 ) : (
                    <span className="inline-block text-xs text-muted-foreground italic px-2 py-1 bg-muted/40 rounded-md">
                       Kup w dowolnym miejscu
                    </span>
                 )}
              </div>
           </div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] pb-24 text-foreground selection:bg-emerald-500/20 selection:text-emerald-600 dark:selection:text-emerald-300">
       
       {/* Background decorative gradients */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
       </div>

       <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
          
           {/* Header */}
          <header className="mb-16 text-center">
             <div className="inline-flex items-center justify-center space-x-2 mb-6 w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-border/60 shadow-xl shadow-black/5 rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
                    {salonName?.charAt(0) || 'S'}
                </div>
             </div>
             <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
               Twój Plan Pielęgnacyjny
             </h1>
             <p className="text-lg text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
               Skrojona na miarę rutyna dla <span className="text-emerald-600 dark:text-emerald-400 font-bold">{clientName}</span> odłożona w czasie, stworzona w <span className="font-semibold text-foreground">{salonName}</span>.
             </p>
          </header>

          {/* Morning Routine */}
          <section className="mb-16 relative">
             <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-amber-300 to-amber-500/10 rounded-full" />
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                   </svg>
                </div>
                <div>
                   <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-200 dark:to-orange-400 bg-clip-text text-transparent">Poranek</h2>
                   {plan.morning_description && <p className="text-sm text-muted-foreground mt-0.5">{plan.morning_description}</p>}
                </div>
             </div>
             
             {morningProducts.length > 0 ? (
                <div className="space-y-4">
                   {morningProducts.map((p: any, i: number) => renderProduct(p, i))}
                </div>
             ) : (
                <p className="text-muted-foreground italic pl-12">Brak produktów na ten czas.</p>
             )}
          </section>

          {/* Evening Routine */}
          <section className="mb-16 relative">
             <div className="absolute -left-4 top-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-indigo-500/10 rounded-full" />
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                   </svg>
                </div>
                <div>
                   <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 dark:from-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">Wieczór</h2>
                   {plan.evening_description && <p className="text-sm text-muted-foreground mt-0.5">{plan.evening_description}</p>}
                </div>
             </div>
             
             {eveningProducts.length > 0 ? (
                <div className="space-y-4">
                   {eveningProducts.map((p: any, i: number) => renderProduct(p, i))}
                </div>
             ) : (
                <p className="text-muted-foreground italic pl-12">Brak produktów na ten czas.</p>
             )}
          </section>

          {/* Footer & Total */}
          <footer className="mt-20 pt-10 border-t border-border/50 text-center">
             <div className="inline-block px-8 py-5 bg-gradient-to-b from-background to-muted/30 border border-border/60 rounded-3xl shadow-xl shadow-black/5">
                <span className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Szacowany koszt kuracji</span>
                <span className="block text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                   ~ {totalCost.toFixed(2)} zł
                </span>
             </div>
             
             <p className="mt-12 text-xs font-semibold text-muted-foreground/60 tracking-wider">
                WYGENEROWANO PRZEZ <span className="text-foreground tracking-widest ml-1">DOCVUE</span>
             </p>
          </footer>
       </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Link as LinkIcon, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClientCombobox } from '@/components/admin/client-combobox'

interface Product {
  id?: string
  name: string
  url: string
  image_url?: string | null
  price: number | null
  usage_description?: string
}

interface EditBeautyPlanDialogProps {
  clientId: string
  salonId: string
  planId?: string
  initialMorningDesc?: string
  initialEveningDesc?: string
  initialMorningProducts?: Product[]
  initialEveningProducts?: Product[]
  trigger?: React.ReactNode
}

export function EditBeautyPlanDialog({
  clientId,
  salonId,
  planId,
  initialMorningDesc = '',
  initialEveningDesc = '',
  initialMorningProducts = [],
  initialEveningProducts = [],
  trigger
}: EditBeautyPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [morningDesc, setMorningDesc] = useState(initialMorningDesc)
  const [eveningDesc, setEveningDesc] = useState(initialEveningDesc)
  
  const [morningProducts, setMorningProducts] = useState<Product[]>(initialMorningProducts)
  const [eveningProducts, setEveningProducts] = useState<Product[]>(initialEveningProducts)
  
  const [scrapingIndex, setScrapingIndex] = useState<{ time: 'morning' | 'evening', index: number } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const handleAddProduct = (time: 'morning' | 'evening') => {
    const newProduct = { name: '', url: '', price: null, usage_description: '' }
    if (time === 'morning') {
      setMorningProducts([...morningProducts, newProduct])
    } else {
      setEveningProducts([...eveningProducts, newProduct])
    }
  }

  const handleRemoveProduct = (time: 'morning' | 'evening', index: number) => {
    if (time === 'morning') {
      setMorningProducts(morningProducts.filter((_, i) => i !== index))
    } else {
      setEveningProducts(eveningProducts.filter((_, i) => i !== index))
    }
  }

  const handleProductChange = (time: 'morning' | 'evening', index: number, field: keyof Product, value: any) => {
    if (time === 'morning') {
      setMorningProducts(prev => {
        const newProducts = [...prev]
        newProducts[index] = { ...newProducts[index], [field]: value }
        return newProducts
      })
    } else {
      setEveningProducts(prev => {
        const newProducts = [...prev]
        newProducts[index] = { ...newProducts[index], [field]: value }
        return newProducts
      })
    }
  }

  const handleFetchPrice = async (time: 'morning' | 'evening', index: number, url: string) => {
    if (!url) return
    
    setScrapingIndex({ time, index })
    try {
      const res = await fetch('/api/scrape-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      const data = await res.json()
      
      let updatedSomething = false
      if (data.price !== undefined && data.price !== null) {
        handleProductChange(time, index, 'price', data.price)
        updatedSomething = true
      }
      
      if (data.imageUrl) {
        handleProductChange(time, index, 'image_url', data.imageUrl)
        updatedSomething = true
      }
      
      if (data.name) {
        // Only update name if it's currently empty, or if we want to overwrite
        handleProductChange(time, index, 'name', data.name)
        updatedSomething = true
      }
      
      if (updatedSomething) {
        toast.success('Pobrano dane produktu!')
      } else {
        toast.error('Nie udało się pobrać danych. Wpisz je ręcznie.')
      }
    } catch (error) {
       toast.error('Wystąpił błąd podczas pobierania danych z linku.')
    } finally {
      setScrapingIndex(null)
    }
  }

  const handleUrlChange = (time: 'morning' | 'evening', index: number, newUrl: string) => {
    // Standard synchronous state update
    handleProductChange(time, index, 'url', newUrl)
    
    // Auto-fetch if it looks like a full URL was pasted/typed
    if (newUrl && newUrl.startsWith('http') && newUrl.length > 10) {
       // Fire fetch immediately without timeout, but debounce it logically via state check
       if (scrapingIndex?.time !== time || scrapingIndex?.index !== index) {
           handleFetchPrice(time, index, newUrl)
       }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let currentPlanId = planId

      // 1. Create or Update the main beauty_plan
      if (currentPlanId) {
        const { error } = await supabase
          .from('beauty_plans')
          .update({
            morning_description: morningDesc,
            evening_description: eveningDesc
          })
          .eq('id', currentPlanId)
        
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('beauty_plans')
          .insert({
            client_id: clientId,
            salon_id: salonId,
            morning_description: morningDesc,
            evening_description: eveningDesc
          })
          .select('id')
          .single()
          
        if (error) throw error
        currentPlanId = data.id
      }

      // 2. Clear old products to simplify sync
      if (planId) {
         await supabase
           .from('beauty_plan_products')
           .delete()
           .eq('plan_id', planId)
      }

      // 3. Insert new products
      const allProducts = [
        ...morningProducts.map(p => ({
          plan_id: currentPlanId,
          time_of_day: 'morning',
          name: p.name,
          url: p.url || null,
          image_url: p.image_url || null,
          price: p.price || null,
          usage_description: p.usage_description || null
        })),
        ...eveningProducts.map(p => ({
          plan_id: currentPlanId,
          time_of_day: 'evening',
          name: p.name,
          url: p.url || null,
          image_url: p.image_url || null,
          price: p.price || null,
          usage_description: p.usage_description || null
        }))
      ]

      if (allProducts.length > 0) {
        const { error: productsError } = await supabase
          .from('beauty_plan_products')
          .insert(allProducts)
          
        if (productsError) throw productsError
      }

      toast.success(planId ? 'Zaktualizowano Beauty Plan!' : 'Utworzono Beauty Plan!')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('Szczegóły błędu Beauty Plan:', error)
      const errorMsg = error?.message || error?.details || error?.hint || 'Wystąpił nieznany błąd zapisu'
      toast.error(`Błąd: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const renderProductSection = (time: 'morning' | 'evening', products: Product[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Kosmetyki ({time === 'morning' ? 'Rano' : 'Wieczór'})
        </h3>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => handleAddProduct(time)}
          className="h-8 text-xs border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors"
        >
          <Plus className="w-3 h-3 mr-1" />
          Dodaj kosmetyk
        </Button>
      </div>

      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3 relative group"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveProduct(time, index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex flex-col gap-4">
               {/* Top row: Image & URL Input */}
               <div className="flex gap-4">
                  {product.image_url ? (
                     <div className="w-16 h-16 rounded-lg border border-border/50 bg-background overflow-hidden shrink-0 hidden sm:block">
                        <img src={product.image_url} alt="Produkt" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                     <div className="w-16 h-16 rounded-lg border border-border/50 bg-muted/40 shrink-0 hidden sm:flex items-center justify-center text-muted-foreground">
                        <LinkIcon className="w-5 h-5 opacity-50" />
                     </div>
                  )}
                  
                  <div className="flex-1">
                     <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                       <LinkIcon className="w-3 h-3" />
                       Wklej link do sklepu (autouzupełni dane)
                     </label>
                     <div className="flex gap-2">
                       <input
                         type="url"
                         required
                         value={product.url}
                         onChange={(e) => handleUrlChange(time, index, e.target.value)}
                         placeholder="https://..."
                         className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                       />
                       <Button
                         type="button"
                         variant="secondary"
                         onClick={() => handleFetchPrice(time, index, product.url)}
                         disabled={!product.url || scrapingIndex?.time === time && scrapingIndex?.index === index}
                         className="shrink-0 bg-emerald-100/50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300"
                       >
                         {scrapingIndex?.time === time && scrapingIndex?.index === index ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                         ) : (
                           'Pobierz'
                         )}
                       </Button>
                     </div>
                  </div>
               </div>

               {/* Second row: Name and Price (Auto-filled but editable) */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                 <div className="md:col-span-3">
                   <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nazwa produktu</label>
                   <input
                     type="text"
                     required
                     value={product.name}
                     onChange={(e) => handleProductChange(time, index, 'name', e.target.value)}
                     placeholder="Np. CeraVe Oczyszczający żel"
                     className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                   />
                 </div>
                 <div className="md:col-span-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Cena (PLN)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={product.price || ''}
                        onChange={(e) => handleProductChange(time, index, 'price', parseFloat(e.target.value) || null)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                 </div>
               </div>

               {/* Third row: Usage Description */}
               <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Instrukcja użycia dla klienta (opcjonalnie)</label>
                  <textarea
                    value={product.usage_description || ''}
                    onChange={(e) => handleProductChange(time, index, 'usage_description', e.target.value)}
                    rows={2}
                    placeholder="Wklep delikatnie w okolicę oka..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
               </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Plus className="w-4 h-4 mr-2" />
            Utwórz Beauty Plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {planId ? 'Edytuj Beauty Plan' : 'Nowy Beauty Plan'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 mt-4">
          
          {/* Morning Section */}
          <div className="space-y-5 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
               </div>
               <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">Pielęgnacja Poranna</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-900/70 dark:text-amber-100/70">Wskazówki / Opis rutyny</label>
              <textarea
                value={morningDesc}
                onChange={(e) => setMorningDesc(e.target.value)}
                rows={3}
                placeholder="Np. 1. Oczyszczanie, 2. Tonizacja, 3. Krem z filtrem..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-amber-200/50 dark:border-amber-800/50 bg-white/60 dark:bg-black/20 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all placeholder:text-amber-900/30 dark:placeholder:text-amber-100/20 backdrop-blur-sm"
              />
            </div>

            {renderProductSection('morning', morningProducts)}
          </div>

          {/* Evening Section */}
          <div className="space-y-5 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
               </div>
               <h2 className="text-lg font-bold text-indigo-800 dark:text-indigo-200">Pielęgnacja Wieczorna</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-900/70 dark:text-indigo-100/70">Wskazówki / Opis rutyny</label>
              <textarea
                value={eveningDesc}
                onChange={(e) => setEveningDesc(e.target.value)}
                rows={3}
                placeholder="Np. 1. Demakijaż, 2. Mycie twarzy, 3. Serum z retinolem..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 bg-white/60 dark:bg-black/20 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all placeholder:text-indigo-900/30 dark:placeholder:text-indigo-100/20 backdrop-blur-sm"
              />
            </div>

            {renderProductSection('evening', eveningProducts)}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="button" variant="ghost" className="mr-3 hover:text-emerald-600 hover:bg-emerald-500/10 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz Plan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

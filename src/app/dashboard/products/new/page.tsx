'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCategories, saveProduct } from '@/app/actions/products'
import { 
  ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, 
  Settings, HelpCircle, Check, Loader
} from 'lucide-react'

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Custom states for images list & variants list
  const [imageUrls, setImageUrls] = useState<string[]>(['']) // Start with 1 empty string input
  const [variants, setVariants] = useState<{ name: string; price_override: number }[]>([])
  
  // Temp variant input
  const [varName, setVarName] = useState('')
  const [varPrice, setVarPrice] = useState<number | ''>('')

  useEffect(() => {
    async function loadCategories() {
      const data = await getCategories()
      setCategories(data)
      setLoadingCats(false)
    }
    loadCategories()
  }, [])

  const handleAddImageUrl = () => {
    if (imageUrls.length >= 5) {
      alert("A maximum of 5 images is allowed.")
      return
    }
    setImageUrls([...imageUrls, ''])
  }

  const handleUpdateImageUrl = (idx: number, val: string) => {
    const updated = [...imageUrls]
    updated[idx] = val
    setImageUrls(updated)
  }

  const handleRemoveImageUrl = (idx: number) => {
    if (imageUrls.length === 1) return // Min 1 image input
    const filtered = imageUrls.filter((_, i) => i !== idx)
    setImageUrls(filtered)
  }

  const handleAddVariant = () => {
    if (!varName.trim()) return
    const price = varPrice === '' ? 0 : parseFloat(varPrice.toString())
    setVariants([...variants, { name: varName, price_override: price }])
    setVarName('')
    setVarPrice('')
  }

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    
    // Filter out empty image URLs
    const filteredImages = imageUrls.filter(url => url.trim().length > 0)
    
    if (filteredImages.length < 1) {
      setErrorMsg('At least 1 product image URL is required.')
      setSubmitting(false)
      return
    }

    formData.append('imageUrls', JSON.stringify(filteredImages))
    formData.append('variants', JSON.stringify(variants))

    const result = await saveProduct(formData)
    setSubmitting(false)

    if (result.error) {
      setErrorMsg(result.error)
    } else if (result.success) {
      router.push('/dashboard/products')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-4 z-10 flex items-center gap-3 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <Link href="/dashboard/products" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-extrabold text-sm text-slate-300">Add New Product</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 z-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Basic Fields */}
          <div className="space-y-4 bg-slate-900/30 border border-slate-900 p-4.5 rounded-3xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Product Info</h3>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Product Name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="e.g. Fresh Apples"
                className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="e.g. Organic, local farm fresh..."
                className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Base Price (₹)</label>
                <input
                  name="price"
                  type="number"
                  required
                  placeholder="e.g. 100"
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  name="categoryId"
                  disabled={loadingCats}
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all disabled:opacity-50"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stock Status</label>
                <select
                  name="availabilityStatus"
                  defaultValue="in_stock"
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="limited_stock">Limited Stock</option>
                  <option value="out_of_stock">Out Of Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Images (URLs) - Min 1, Max 5 */}
          <div className="space-y-4 bg-slate-900/30 border border-slate-900 p-4.5 rounded-3xl">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Images (URLs)</h3>
              <span className="text-[9px] text-slate-500 font-bold">{imageUrls.length} / 5</span>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Enter public image web URLs (e.g. from unsplash or other hostings). Max 5 images.
            </p>

            <div className="space-y-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <ImageIcon className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleUpdateImageUrl(idx, e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                    />
                  </div>
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(idx)}
                      className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl active:scale-95 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {imageUrls.length < 5 && (
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="w-full flex justify-center items-center gap-1.5 rounded-2xl bg-slate-900 border border-slate-850 py-2.5 text-[10px] font-bold text-slate-400 hover:text-slate-300 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Image Field
              </button>
            )}
          </div>

          {/* Product Variants (Grocery: 500g/1kg, Clothing: S/M, Electronics: Colors) */}
          <div className="space-y-4 bg-slate-900/30 border border-slate-900 p-4.5 rounded-3xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Product Variants</h3>
            <p className="text-[10px] text-slate-500 leading-normal mb-3">
              Define options such as size (S, M, L), weight (500g, 1kg), or color (Black, Blue).
            </p>

            {/* List current variants */}
            {variants.length > 0 && (
              <div className="space-y-2 mb-4 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-900/60">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-900/40">
                    <span className="font-bold text-slate-300">{v.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sky-400 font-extrabold">₹{v.price_override || 'Same Price'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded active:scale-90 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variant Add Form */}
            <div className="grid grid-cols-2 gap-3 items-end bg-slate-950/20 p-3 rounded-2xl border border-slate-900">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Option Name</label>
                <input
                  type="text"
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  placeholder="e.g. 1 KG"
                  className="block w-full rounded-xl border-0 bg-slate-900 px-3 py-2 text-xs text-slate-200 ring-1 ring-inset ring-slate-850 outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Price Override (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={varPrice}
                    onChange={(e) => setVarPrice(e.target.value !== '' ? parseFloat(e.target.value) : '')}
                    placeholder="e.g. 190"
                    className="block w-full rounded-xl border-0 bg-slate-900 px-3 py-2 text-xs text-slate-200 ring-1 ring-inset ring-slate-850 outline-none flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="p-2 rounded-xl bg-sky-500 text-slate-950 hover:bg-sky-400 font-black active:scale-95 transition-all text-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center gap-2 rounded-2xl bg-sky-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {submitting ? 'Saving Item...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

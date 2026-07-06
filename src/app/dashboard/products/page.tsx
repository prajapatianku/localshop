'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getShopkeeperShop } from '@/app/actions/shops'
import { getShopProducts, deleteProduct } from '@/app/actions/products'
import { 
  Store, Plus, Edit3, Trash2, ArrowLeft, Loader,
  ShoppingBag, CheckCircle2, Info, AlertTriangle, Eye
} from 'lucide-react'

export default function ShopkeeperProductsPage() {
  const [shop, setShop] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)
      const shopData = await getShopkeeperShop()
      setShop(shopData)

      if (shopData) {
        const prodData = await getShopProducts(shopData.id)
        setProducts(prodData)
      }
      setLoading(false)
    }
    loadProducts()
  }, [])

  const handleDelete = async (productId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product from your store?")
    if (!confirmDelete) return

    setDeletingId(productId)
    setError(null)
    const result = await deleteProduct(productId)

    if (result.error) {
      setError(result.error)
      setDeletingId(null)
    } else {
      // Reload products
      if (shop) {
        const prodData = await getShopProducts(shop.id)
        setProducts(prodData)
      }
      setDeletingId(null)
    }
  }

  // Rendering Helper: Availability badge
  const renderAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold uppercase tracking-wider">In Stock</span>
      case 'limited_stock':
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider">Limited Stock</span>
      default:
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-bold uppercase tracking-wider animate-pulse">Out Of Stock</span>
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-4 z-10 flex justify-between items-center border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-extrabold text-sm text-slate-300">My Products</span>
        </div>

        {shop && (
          <Link 
            href="/dashboard/products/new" 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-black shadow-lg shadow-sky-500/5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Add Item
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 z-10">
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16 text-slate-500 text-xs">
            <Loader className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mb-3 text-sky-400" />
            Loading catalog items...
          </div>
        ) : !shop ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Please register your shop first in dashboard.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-16 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl p-6">
            <ShoppingBag className="w-8 h-8 text-slate-800 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-400">No Products Listed</p>
            <p className="text-[10px] text-slate-650 mt-1 max-w-[200px] leading-normal">
              You haven't listed any catalog items yet. Tap "Add Item" at the top to list your first product.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const image = product.product_images?.[0]?.image_url || '/placeholder.png'
              return (
                <div 
                  key={product.id} 
                  className="flex bg-slate-900/30 border border-slate-900 p-3.5 rounded-3xl items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img 
                      src={image} 
                      alt={product.name} 
                      className="w-12 h-12 object-cover rounded-2xl bg-slate-950 shrink-0 border border-slate-900"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{product.name}</h4>
                        {renderAvailabilityBadge(product.availability_status)}
                      </div>
                      <span className="block text-[11px] font-black text-sky-400">₹{product.price}</span>
                      {product.variants?.length > 0 && (
                        <span className="block text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wide">
                          {product.variants.length} variant{(product.variants.length) !== 1 ? 's' : ''} listed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/dashboard/products/edit/${product.id}`}
                      className="p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-900/60 rounded-xl active:scale-95 transition-all"
                      title="Edit Product"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="p-2.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl active:scale-95 transition-all"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

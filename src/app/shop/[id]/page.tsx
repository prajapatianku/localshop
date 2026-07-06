import React from 'react'
import Link from 'next/link'
import { getShopDetails, getShopkeeperShop } from '@/app/actions/shops'
import { getShopProducts } from '@/app/actions/products'
import { getShopReviews } from '@/app/actions/user'
import { 
  Phone, MessageSquare, Share2, ShoppingBag, 
  MapPin, Clock, Award, CheckCircle2, ChevronRight,
  Sparkles, Star, AlertTriangle, ArrowLeft
} from 'lucide-react'

interface ShopPageProps {
  params: Promise<{ id: string }>
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { id: shopId } = await params
  const shop = await getShopDetails(shopId)
  const products = await getShopProducts(shopId)
  const reviews = await getShopReviews(shopId)

  if (!shop) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-200">Shop Not Found</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
          The store you are trying to view does not exist or has been disabled.
        </p>
        <Link href="/" className="mt-6 px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold">
          Go Back Home
        </Link>
      </main>
    )
  }

  // Calculate Average Rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'New'

  const renderVerificationIcon = (level: string) => {
    switch (level) {
      case 'premium':
        return <Award className="w-5 h-5 text-amber-400 fill-amber-400/20" />
      case 'verified':
        return <CheckCircle2 className="w-5 h-5 text-sky-400" />
      default:
        return null
    }
  }

  const renderStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase tracking-wider">Open Now</span>
      case 'closing_soon':
        return <span className="px-2.5 py-1 rounded-full text-[10px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 uppercase tracking-wider animate-pulse">Closing Soon</span>
      case 'holiday':
        return <span className="px-2.5 py-1 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase tracking-wider">Holiday</span>
      case 'temporarily_closed':
        return <span className="px-2.5 py-1 rounded-full text-[10px] bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 uppercase tracking-wider">Temp Closed</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] bg-slate-800 text-slate-500 font-bold border border-slate-700 uppercase tracking-wider">Closed</span>
    }
  }

  // Subscriptions warning banner for customer (if expired, cannot buy from here)
  const isExpired = shop.subscriptions?.[0]?.status === 'expired'

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />
      
      {/* Top sticky banner */}
      <div className="px-4 py-4 z-10 flex items-center gap-3 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-extrabold text-sm text-slate-300">Store Profile</span>
      </div>

      {isExpired && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-xs text-amber-400 flex items-start gap-3 z-10">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-normal">
            <strong>Store offline</strong>: This shop is temporarily disabled due to subscription expiry. You can view the items, but orders are blocked.
          </p>
        </div>
      )}

      {/* Shop Profile Header */}
      <div className="px-4 pt-5 pb-4 z-10">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {renderStatusLabel(shop.status)}
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded-full">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {avgRating}
              </span>
            </div>
            
            <h1 className="text-2xl font-black tracking-tight text-slate-100 mt-3.5 flex items-center gap-2">
              {shop.name}
              {renderVerificationIcon(shop.verification_level)}
            </h1>
            
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {shop.description || 'Welcome to our store. We serve high quality items locally.'}
            </p>
          </div>
        </div>

        {/* Location / ETA detail row */}
        <div className="flex flex-col gap-2 mt-4 pt-3.5 border-t border-slate-900/60 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">{shop.phone ? `Call us: ${shop.phone}` : 'Hyperlocal delivery partner'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1 font-semibold">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-650" />
              <span>ETA: {shop.estimated_delivery_time}</span>
            </div>
            
            <div>
              {shop.delivery_available ? (
                <span>
                  Delivery: {shop.delivery_charge === 0 ? 'FREE' : `₹${shop.delivery_charge}`}
                  {shop.free_delivery_threshold > 0 && ` (Free > ₹${shop.free_delivery_threshold})`}
                </span>
              ) : (
                <span className="text-slate-600">Pickup Only</span>
              )}
            </div>
          </div>
        </div>

        {/* Core Actions Buttons (Chat, Call, Share, View Products) - No Place Order! */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          <Link
            href={`/chat/${shop.id}`}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-sky-400 text-slate-400 active:scale-95 transition-all text-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-tight">Chat</span>
          </Link>

          <a
            href={shop.phone ? `tel:${shop.phone}` : '#'}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-sky-400 text-slate-400 active:scale-95 transition-all text-center gap-1.5"
          >
            <Phone className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-tight">Call</span>
          </a>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: shop.name,
                  text: shop.description,
                  url: window.location.href
                })
              } else {
                navigator.clipboard.writeText(window.location.href)
                alert('Shop link copied to clipboard!')
              }
            }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-850 hover:bg-slate-850 hover:text-sky-400 text-slate-400 active:scale-95 transition-all text-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-tight">Share</span>
          </button>

          <a
            href="#products-section"
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 active:scale-95 transition-all text-center gap-1.5 font-bold shadow-md shadow-sky-500/5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Products</span>
          </a>
        </div>
      </div>

      {/* Catalog / Products Section */}
      <div id="products-section" className="px-4 py-4 border-t border-slate-900/60 z-10 flex-1 flex flex-col">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          Product Catalog ({products.length})
        </h3>

        {products.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center py-12 text-center text-slate-500">
            <ShoppingBag className="w-8 h-8 text-slate-700 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-400">No products listed</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              This merchant has not uploaded any catalog items yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {products.map((product) => {
              const image = product.product_images?.[0]?.image_url || '/placeholder.png'
              
              // Product availability helpers
              const isOutOfStock = product.availability_status === 'out_of_stock'
              const isLimited = product.availability_status === 'limited_stock'

              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="block bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden hover:border-slate-850 transition-all flex flex-col justify-between"
                >
                  {/* Image container */}
                  <div className="aspect-square bg-slate-950 relative flex items-center justify-center border-b border-slate-900/40">
                    <img 
                      src={image} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                    />

                    {/* Stock Status Badge */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-[9px] font-black tracking-widest text-rose-400 uppercase border border-rose-500/30 px-2 py-0.5 rounded-lg bg-rose-950/40">
                          Out Of Stock
                        </span>
                      </div>
                    )}
                    
                    {isLimited && !isOutOfStock && (
                      <div className="absolute top-2 left-2">
                        <span className="text-[8px] font-black tracking-wider text-amber-400 uppercase border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-950/40">
                          Limited Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body details */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-1 tracking-tight">
                        {product.name}
                      </h4>
                      {product.variants?.length > 0 && (
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                          {product.variants.length} variant{(product.variants.length) !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-900/60">
                      <span className="text-xs font-black text-sky-400">
                        ₹{product.price}
                      </span>
                      <span className="text-[9px] text-slate-500 hover:text-slate-300 font-bold flex items-center gap-0.5">
                        Details <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

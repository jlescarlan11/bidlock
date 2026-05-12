import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bidlock.ph'

const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${base}/` },
  { url: `${base}/auth/login` },
  { url: `${base}/auth/signup` },
  { url: `${base}/listings/new` },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const db = await createClient()
  const { data } = await db
    .from('listings')
    .select('id, ends_at')
    .in('status', ['live', 'ended'])
    .gte('ends_at', thirtyDaysAgo.toISOString())

  const listings = (data ?? []) as Array<{ id: string; ends_at: string }>

  const dynamicRoutes: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${base}/listings/${listing.id}`,
    lastModified: new Date(listing.ends_at),
  }))

  return [...staticRoutes, ...dynamicRoutes]
}

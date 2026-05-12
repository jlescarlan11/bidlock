import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'BidLock — Philippine Auction Marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f5f3ff',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 900, color: '#7c3aed', letterSpacing: '-2px' }}>
          BidLock
        </div>
        <div style={{ fontSize: 30, color: '#6b7280', fontWeight: 500 }}>
          Philippine Auction Marketplace
        </div>
      </div>
    ),
    { ...size }
  )
}

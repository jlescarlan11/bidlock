import { describe, it, expect } from 'vitest'
import { sumBids } from '../total-sold'

describe('sumBids', () => {
  it('sums bid amounts correctly', () => {
    const rows = [{ current_bid: 100 }, { current_bid: 250 }, { current_bid: 50 }]
    expect(sumBids(rows)).toBe(400)
  })

  it('returns 0 for empty array', () => {
    expect(sumBids([])).toBe(0)
  })

  it('handles numeric strings (Supabase may return strings)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = [{ current_bid: '100' as any }, { current_bid: '200.50' as any }]
    expect(sumBids(rows)).toBeCloseTo(300.5)
  })

  it('matches what RPC should return for the same fixture', () => {
    const fixture = [
      { current_bid: 500 },
      { current_bid: 1200 },
      { current_bid: 750 },
    ]
    const rpcEquivalent = 2450
    expect(sumBids(fixture)).toBe(rpcEquivalent)
  })
})

import { describe, it, expect } from 'vitest'
import { resolveContactDisplay } from '../contact-display'

describe('resolveContactDisplay', () => {
  it('returns winner contact for auctioneer', () => {
    const result = resolveContactDisplay(
      true,
      { phone_number: '09171234567', gcash_name: 'Juan D' },
      null,
    )
    expect(result).toEqual({
      label: "Winner's contact",
      phone: '09171234567',
      gcash: 'Juan D',
    })
  })

  it('returns seller contact for winner', () => {
    const result = resolveContactDisplay(
      false,
      null,
      { phone_number: '09189876543', gcash_name: 'Maria S' },
    )
    expect(result).toEqual({
      label: "Seller's contact",
      phone: '09189876543',
      gcash: 'Maria S',
    })
  })

  it('returns null when no contact data available', () => {
    expect(resolveContactDisplay(true, null, null)).toBeNull()
    expect(resolveContactDisplay(false, null, null)).toBeNull()
  })

  it('returns null when isWinner but no sellerContact', () => {
    expect(resolveContactDisplay(false, null, null)).toBeNull()
  })
})

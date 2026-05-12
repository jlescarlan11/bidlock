export type ContactDisplay = {
  label: string
  phone: string | null
  gcash: string | null
}

export function resolveContactDisplay(
  isAuctioneer: boolean,
  winnerContact: { phone_number: string | null; gcash_name: string | null } | null,
  sellerContact: { phone_number: string | null; gcash_name: string | null } | null,
): ContactDisplay | null {
  if (isAuctioneer && winnerContact) {
    return {
      label: "Winner's contact",
      phone: winnerContact.phone_number,
      gcash: winnerContact.gcash_name,
    }
  }
  if (!isAuctioneer && sellerContact) {
    return {
      label: "Seller's contact",
      phone: sellerContact.phone_number,
      gcash: sellerContact.gcash_name,
    }
  }
  return null
}

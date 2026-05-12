export function sumBids(rows: { current_bid: number }[]): number {
  return rows.reduce((sum, r) => sum + Number(r.current_bid), 0)
}

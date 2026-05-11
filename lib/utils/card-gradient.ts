export const CARD_GRADIENTS = [
  'from-violet-100 to-purple-50',
  'from-orange-100 to-amber-50',
  'from-teal-100 to-emerald-50',
  'from-rose-100 to-pink-50',
  'from-blue-100 to-sky-50',
  'from-yellow-100 to-lime-50',
]

export function cardGradient(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length]
}

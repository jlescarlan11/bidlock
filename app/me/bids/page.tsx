import { redirect } from 'next/navigation'

export default function MyBidsPage() {
  redirect('/me?tab=bids')
}

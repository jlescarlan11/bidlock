import { redirect } from 'next/navigation'

export default function MyListingsPage() {
  redirect('/me?tab=listings')
}

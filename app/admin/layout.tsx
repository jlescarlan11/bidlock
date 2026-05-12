import AdminTabBar from './admin-tab-bar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabBar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}

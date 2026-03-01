export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50">
      {children}
    </div>
  )
}

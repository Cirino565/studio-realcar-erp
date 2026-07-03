export default function AssistencialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col overflow-x-hidden">
      {children}
    </div>
  )
}
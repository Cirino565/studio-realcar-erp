export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell min-h-[100dvh] bg-slate-50 text-slate-950">
      {children}
    </div>
  );
}
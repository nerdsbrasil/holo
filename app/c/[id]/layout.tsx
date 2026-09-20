export default function MemberCardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}

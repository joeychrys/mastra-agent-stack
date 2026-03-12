import NavBar from '@/components/nav-bar';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

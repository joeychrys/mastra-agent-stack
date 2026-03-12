'use client';

export default function DashboardPage() {
  return (
    <div className="container m-8 mx-auto max-w-2xl rounded-lg border p-8">
      <h1 className="text-2xl font-bold">Dashboard Page</h1>
      <p className="text-muted-foreground">Welcome to your dashboard</p>
      <p className="text-muted-foreground">
        This page is protected and can only be accessed by authenticated users.
      </p>
    </div>
  );
}

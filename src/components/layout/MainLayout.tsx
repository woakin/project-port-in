import { ReactNode } from "react";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}

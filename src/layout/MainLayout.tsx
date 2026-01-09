import { type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { presenceController } from "../services/presenceController";

type MainLayoutProps = {
  children: ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    presenceController.leave?.();
    logout();
  };

  return (
    <div className="flex min-h-screen w-screen overflow-x-hidden flex-col">
      <Header username={user?.username ?? null} onLogout={handleLogout} />
      <main className="flex grow flex-col bg-gray-100">{children}</main>
      <Footer />
    </div>
  );
}

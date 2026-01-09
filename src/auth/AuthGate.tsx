import { PresenceProvider } from "../state/presenceStore";
import { useAuth } from "./AuthContext";
import LandingPage from "../landing/LandingPage";
import PresenceBootstrap from "../presence/PresenceBootstrap";
import App from "../App";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function AuthGate() {
  const { user, loading, backendAvailable } = useAuth();

  if (loading) {
    return null;
  }

  if (!backendAvailable) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100">
        <Header showUserMenu={false} />
        <main className="flex grow items-center justify-center px-4">
          <div className="text-center">
            <p className="text-3xl font-semibold text-gray-800">We are sorry…</p>
            <p className="mt-2 text-2xl font-medium text-gray-600">Service Unavailable</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <PresenceProvider key={user.id}>
      <PresenceBootstrap />
      <App />
    </PresenceProvider>
  );
}

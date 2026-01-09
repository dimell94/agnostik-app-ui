import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type AuthUser = {
  id: number;
  username?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  backendAvailable: boolean;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  backendAvailable: true,
  setUser: () => {},
  logout: () => {},
});

function getStoredToken() {
  return typeof window !== "undefined"
    ? window.localStorage.getItem("authToken")
    : null;
}

function storeToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem("authToken");
  } else {
    window.localStorage.setItem("authToken", token);
  }
}

async function fetchCurrentUser(token: string) {
  const res = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = new Error("unauthorized") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return (await res.json()) as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    let cancelled = false;
    const markBackend = (value: boolean) => {
      if (!cancelled) {
        setBackendAvailable(value);
      }
    };
    const finishLoading = () => {
      if (!cancelled) {
        setLoading(false);
      }
    };

    if (!token) {
      const pingBackend = async () => {
        try {
          const res = await fetch("/api/auth/me");
          if (cancelled) return;
          if (res.ok) {
            const currentUser = (await res.json()) as AuthUser;
            setUser(currentUser);
          } else if (res.status === 401) {
            // untreated auth, but server reachable
          } else if (res.status === 404 || res.status >= 500) {
            markBackend(false);
            return;
          }
          markBackend(true);
        } catch (err) {
          if (cancelled) return;
          if (err instanceof TypeError) {
            markBackend(false);
          } else {
            markBackend(true);
          }
        } finally {
          finishLoading();
        }
      };
      void pingBackend();
    } else {
      fetchCurrentUser(token)
        .then((currentUser) => {
          if (!cancelled) {
            setUser(currentUser);
            markBackend(true);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof TypeError) {
            markBackend(false);
          } else {
            const status = (err as { status?: number }).status;
            if (status != null && (status === 404 || status >= 500)) {
              markBackend(false);
            } else {
              markBackend(true);
            }
            if (status === 401) {
              storeToken(null);
              setUser(null);
            }
          }
        })
        .finally(() => {
          finishLoading();
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, backendAvailable, setUser, logout }),
    [user, loading, backendAvailable, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function setAuthToken(token: string | null) {
  storeToken(token);
}

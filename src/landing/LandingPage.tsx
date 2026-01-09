import { FormEvent, useContext, useEffect, useState } from "react";
import { AuthContext, setAuthToken } from "../auth/AuthContext";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

type AuthResponse = {
  token: string;
  userId: number;
  username?: string | null;
};

type AuthError = string | null;

type Mode = "login" | "register";

const USERNAME_REGEX = /^[A-Za-z0-9._-]+$/;
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 9;

const validateUsername = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Username cannot be blank";
  }
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return "Minimum characters: 2";
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return "Maximum characters: 30";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Allowed only: letters, numbers, dots, hyphens, underscores";
  }
  return null;
};

const validatePassword = (value: string): string | null => {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return "Minimum characters: 9";
  }
  return null;
};

export default function LandingPage() {
  const { setUser } = useContext(AuthContext);
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthError>(null);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const containerClass = isLogin
    ? "max-w-md w-full bg-white text-gray-800 shadow-lg rounded-lg p-8"
    : "max-w-md w-full bg-gray-200 text-gray-900 shadow-lg rounded-lg p-8";
  const headingClass = isLogin
    ? "text-3xl font-bold text-center text-gray-800"
    : "text-3xl font-bold text-center text-gray-900";
  const subtitleClass = "mt-2 text-center text-gray-500";
  const labelClass = isLogin
    ? "block text-sm font-medium text-gray-700"
    : "block text-sm font-medium text-gray-700";
  const inputClass = isLogin
    ? "mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
    : "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500";
  const footerTextClass = isLogin ? "text-center text-sm text-gray-500" : "text-center text-sm text-gray-600";
  const footerLinkClass = isLogin
    ? "font-medium text-gray-700 hover:underline cursor-pointer"
    : "font-medium text-gray-900 hover:underline cursor-pointer";

  useEffect(() => {
    setError(null);
    setUsernameError(null);
    setPasswordError(null);
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isLogin) {
      const newUsernameError = validateUsername(username);
      const newPasswordError = validatePassword(password);
      setUsernameError(newUsernameError);
      setPasswordError(newPasswordError);
      if (newUsernameError || newPasswordError) {
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (!isLogin && res.status === 409) {
          throw new Error("User already exists");
        }
        throw new Error(body?.message ?? body?.error ?? "Authentication failed");
      }

      const data = (await res.json()) as AuthResponse;
      setAuthToken(data.token);
      setUser({ id: data.userId, username: data.username });
      setUsername("");
      setPassword("");
      setUsernameError(null);
      setPasswordError(null);
    } catch (err) {
      if (isLogin) {
        setError("Incorrect username or password");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header showUserMenu={false} />
      <main className="flex grow flex-col items-center justify-center px-4">
        <div className={containerClass}>
          {isLogin ? (
            <>
              <h1 className={headingClass}>Welcome!</h1>
              <p className={subtitleClass}>Sign in to continue</p>
            </>
          ) : (
            <h1 className={headingClass}>Create an account</h1>
          )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelClass}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (!isLogin) {
                  setUsernameError(null);
                }
              }}
              className={inputClass}
              required
              autoComplete="username"
            />
            {!isLogin && usernameError && (
              <p className="mt-1 text-xs text-red-600">{usernameError}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (!isLogin) {
                  setPasswordError(null);
                }
              }}
              className={inputClass}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {!isLogin && passwordError && (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-gray-900 py-2 text-white hover:bg-gray-800 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Please wait…" : isLogin ? "Log In" : "Create Account"}
          </button>
          <p className={footerTextClass}>
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className={footerLinkClass}
                  onClick={() => setMode("register")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={footerLinkClass}
                  onClick={() => setMode("login")}
                >
                  Log in instead
                </button>
              </>
            )}
          </p>
        </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

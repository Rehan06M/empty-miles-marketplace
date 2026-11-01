
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  dashboardForRole,
  getCurrentUser,
  loginUser,
  registerUser,
  setAccessToken,
} from "../services/authApi";

import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../services/authApi";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (data: LoginPayload) => Promise<AuthUser>;
  register: (data: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  homePath: string;
};

const AuthContext = createContext<AuthContextValue | null>(
  null
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(
    null
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setExpiresAt(null);
  }, []);

  const acceptSession = useCallback(
    async (session: AuthSession): Promise<AuthUser> => {
      setAccessToken(session.accessToken);

      try {
        // Confirm that the issued token can access /auth/me.
        const verifiedUser = await getCurrentUser();

        if (
          verifiedUser.id !== session.user.id ||
          verifiedUser.role !== session.user.role ||
          verifiedUser.status !== "ACTIVE"
        ) {
          throw new Error("Authentication session mismatch");
        }

        setUser(verifiedUser);

        setExpiresAt(
          Date.now() + session.expiresInSeconds * 1000
        );

        return verifiedUser;
      } catch (error) {
        logout();
        throw error;
      }
    },
    [logout]
  );

  const login = useCallback(
    async (data: LoginPayload) => {
      const session = await loginUser(data);
      return acceptSession(session);
    },
    [acceptSession]
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const session = await registerUser(data);
      return acceptSession(session);
    },
    [acceptSession]
  );

  useEffect(() => {
    if (expiresAt === null) return;

    const remainingMs = Math.max(0, expiresAt - Date.now());

    const timer = window.setTimeout(() => {
      logout();
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [expiresAt, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        homePath: user
          ? dashboardForRole(user.role)
          : "/login",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

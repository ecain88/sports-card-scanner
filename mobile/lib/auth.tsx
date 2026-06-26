import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import * as SecureStore from "expo-secure-store";
import { convex, CONVEX_URL } from "./convex";

const authSignIn = makeFunctionReference<"action">("auth:signIn");
const authSignOut = makeFunctionReference<"action">("auth:signOut");

const JWT_KEY = "__convexAuthJWT";
const REFRESH_KEY = "__convexAuthRefreshToken";

interface TokenPair {
  token: string;
  refreshToken: string;
}

interface SignInResult {
  tokens?: TokenPair | null;
}

interface AuthActions {
  signIn: (provider: string, params: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface AuthHookState {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (opts: { forceRefreshToken: boolean }) => Promise<string | null>;
}

const AuthActionsCtx = createContext<AuthActions | undefined>(undefined);
const AuthStateCtx = createContext<AuthHookState>({
  isLoading: true,
  isAuthenticated: false,
  fetchAccessToken: async () => null,
});

export function useAuthActions(): AuthActions {
  const ctx = useContext(AuthActionsCtx);
  if (!ctx) throw new Error("useAuthActions must be used inside AuthProvider");
  return ctx;
}

export function useAuth(): AuthHookState {
  return useContext(AuthStateCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const http = useCallback(() => new ConvexHttpClient(CONVEX_URL), []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken && refreshRef.current) {
        try {
          const res = (await http().action(authSignIn, {
            params: { refreshToken: refreshRef.current },
            verifier: undefined,
          })) as SignInResult;
          if (res?.tokens) {
            tokenRef.current = res.tokens.token;

            refreshRef.current = res.tokens.refreshToken ?? null;
            await storeTokens(res.tokens);
            return res.tokens.token;
          }
        } catch {}
        // Refresh failed — clear in-memory refs but keep SecureStore intact.
        // The existing JWT may still be valid; let the server decide.
        tokenRef.current = null;
        refreshRef.current = null;
        return null;
      }
      return tokenRef.current;
    },
    [http]
  );

  useEffect(() => {
    (async () => {
      try {
        const [jwt, refresh] = await Promise.all([
          SecureStore.getItemAsync(JWT_KEY),
          SecureStore.getItemAsync(REFRESH_KEY),
        ]);
        if (jwt) {
          tokenRef.current = jwt;

          refreshRef.current = refresh ?? null;
          convex.setAuth(fetchAccessToken, () => {});
          setIsAuthenticated(true);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, [fetchAccessToken]);

  const signIn = useCallback(
    async (provider: string, params: Record<string, unknown>) => {
      const res = (await http().action(authSignIn, {
        provider,
        params,
        verifier: undefined,
      })) as SignInResult;

      if (!res?.tokens) return;

      tokenRef.current = res.tokens.token;
      refreshRef.current = res.tokens.refreshToken ?? null;
      await storeTokens(res.tokens);
      convex.setAuth(fetchAccessToken, () => {});
      setIsAuthenticated(true);
    },
    [http, fetchAccessToken]
  );

  const signOut = useCallback(async () => {
    try {
      const httpClient = http();
      if (tokenRef.current) httpClient.setAuth(tokenRef.current);
      await httpClient.action(authSignOut, {});
    } catch {}
    tokenRef.current = null;
    refreshRef.current = null;
    await clearTokens();
    convex.clearAuth();
    setIsAuthenticated(false);
  }, [http]);

  const actions = useMemo(() => ({ signIn, signOut }), [signIn, signOut]);
  const state = useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );

  return (
    <AuthActionsCtx.Provider value={actions}>
      <AuthStateCtx.Provider value={state}>
        {children}
      </AuthStateCtx.Provider>
    </AuthActionsCtx.Provider>
  );
}

async function storeTokens(tokens: TokenPair) {
  await Promise.all([
    SecureStore.setItemAsync(JWT_KEY, tokens.token),
    tokens.refreshToken
      ? SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(JWT_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

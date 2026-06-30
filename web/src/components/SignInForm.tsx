import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

/** Email + password sign-in / sign-up using the Convex @convex-dev/auth Password provider. */
export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: 10,
    marginTop: 8,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
  } as const;

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ fontSize: 17, marginTop: 0 }}>{flow === "signIn" ? "Sign in" : "Create account"}</h2>
      <input style={inputStyle} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input style={inputStyle} type="password" placeholder="Password" autoComplete={flow === "signIn" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p style={{ color: "var(--bad)", marginTop: 10 }}>{error}</p>}
      <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 12 }}>
        {busy ? "…" : flow === "signIn" ? "Sign in" : "Sign up"}
      </button>
      <button
        type="button"
        className="secondary"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </form>
  );
}

import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api, type CurrentUser } from "../lib/api";
import { SignInForm } from "../components/SignInForm";

function SignedIn() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.cards.getCurrentUser) as CurrentUser | null | undefined;
  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>
        Signed in{user?.email ? ` as ${user.email}` : ""}.
      </p>
      <button className="secondary" onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="page">
      <h1>Profile</h1>
      <AuthLoading>
        <div className="card"><p className="muted" style={{ margin: 0 }}>Connecting to Convex…</p></div>
      </AuthLoading>
      <Authenticated>
        <SignedIn />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </div>
  );
}

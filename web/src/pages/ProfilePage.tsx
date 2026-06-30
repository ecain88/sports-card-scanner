export function ProfilePage() {
  return (
    <div className="page">
      <h1>Profile</h1>
      <div className="card">
        <p className="muted">
          Sign in with Convex Auth to sync your collection across devices. Auth wiring reuses the
          existing Convex <code>@convex-dev/auth</code> backend.
        </p>
      </div>
    </div>
  );
}

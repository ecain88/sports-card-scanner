import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { ScanPage } from "./pages/ScanPage";
import { CollectionPage } from "./pages/CollectionPage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
        <nav className="nav">
          <NavLink to="/scan">Scan</NavLink>
          <NavLink to="/collection">Collection</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

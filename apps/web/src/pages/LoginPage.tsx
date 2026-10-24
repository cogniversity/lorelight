import { FormEvent, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Aperture } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/series" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/series", { replace: true });
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" style={{ margin: "0 auto 18px" }}>
            <Aperture size={24} strokeWidth={1.7} />
          </div>
          <h1 className="login-title">Lorelight</h1>
          <p className="login-subtitle">Sign in to your story universe</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              required
              autoFocus
              className="login-input"
            />
          </label>

          <label className="login-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="login-input"
            />
          </label>

          {error && (
            <div className="login-error">{error}</div>
          )}

          <button
            type="submit"
            className="primary-button login-submit"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-footer">
          Lorelight · Cinematic Story Production
        </p>
      </div>
    </div>
  );
}

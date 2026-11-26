import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type ApiResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  user?: { full_name?: string; email?: string };
};

async function post(path: string, body: Record<string, string>): Promise<ApiResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach WorkWay. Check that the backend is running.");
  }

  const data = (await response.json().catch(() => ({}))) as ApiResponse;
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="WorkWay home">
      <span className="brand-mark" aria-hidden="true">W</span>
      <span>workway</span>
    </a>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <section className="auth-panel">
        <header className="topbar"><Brand /><span className="topbar-note">Your next step starts here</span></header>
        {children}
        <footer>Discover opportunities. Build skills. Prepare for your career.</footer>
      </section>
      <aside className="story-panel" aria-label="WorkWay introduction">
        <div className="story-orbit orbit-one" />
        <div className="story-orbit orbit-two" />
        <div className="story-content">
          <span className="eyebrow">A clearer path forward</span>
          <h2>Your effort deserves the right opportunity.</h2>
          <p>Find work that fits, understand the skills you need, and move ahead with confidence.</p>
          <div className="story-card">
            <span className="story-card-icon">✳</span>
            <span><strong>One step at a time</strong><small>Make your career journey feel manageable.</small></span>
          </div>
        </div>
        <span className="story-footer">WORKWAY · CAREER DISCOVERY</span>
      </aside>
    </main>
  );
}

function Message({ kind, children }: { kind: "error" | "success"; children: string }) {
  return <div className={`message ${kind}`} role="status">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState("");

  const acceptGoogleCredential = useCallback(async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/auth/google", { credential });
      if (data.token) sessionStorage.setItem("workway_token", data.token);
      setSignedIn(data.user?.full_name || data.user?.email || "your account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google Sign-In failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const initialize = () => {
      const button = document.getElementById("google-sign-in-button");
      if (!button || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: ({ credential }) => void acceptGoogleCredential(credential),
      });
      const buttonWidth = Math.min(360, Math.floor(button.getBoundingClientRect().width));
      window.google.accounts.id.renderButton(button, {
        type: "standard", theme: "outline", size: "large", shape: "rectangular", text: "continue_with", width: buttonWidth,
      });
    };

    const existing = document.getElementById("google-identity-script");
    if (window.google) initialize();
    else if (existing) existing.addEventListener("load", initialize, { once: true });
    else {
      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", initialize, { once: true });
      document.head.append(script);
    }
    return () => document.getElementById("google-sign-in-button")?.replaceChildren();
  }, [acceptGoogleCredential]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/auth/login", { email, password });
      if (data.token) sessionStorage.setItem("workway_token", data.token);
      setSignedIn(data.user?.full_name || data.user?.email || "your account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (signedIn) return <div className="form-content"><span className="success-icon">✓</span><span className="eyebrow">You’re signed in</span><h1>Welcome, {signedIn}</h1><p className="intro">Your WorkWay session is ready.</p><button className="button secondary" onClick={() => { sessionStorage.removeItem("workway_token"); setSignedIn(""); }}>Sign out</button></div>;

  return (
    <div className="form-content">
      <span className="eyebrow">Welcome back</span>
      <h1>Make your next move.</h1>
      <p className="intro">Sign in to continue your career journey.</p>
      {error && <Message kind="error">{error}</Message>}
      <form onSubmit={submit}>
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <div className="password-label"><label htmlFor="password">Password</label><a href="/forgot-password">Forgot password?</a></div>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button className="button primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
      </form>
      <div className="divider"><span>or continue with</span></div>
      {googleClientId ? <div id="google-sign-in-button" className="google-button" /> : <p className="config-note">Add VITE_GOOGLE_CLIENT_ID to enable Google Sign-In.</p>}
    </div>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await post("/api/auth/forgot-password", { email });
      setMessage(result.message || "If an eligible account exists, a reset link has been sent.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not request a reset link."); }
    finally { setBusy(false); }
  };

  return <div className="form-content">
    <a className="back-link" href="/">← Back to sign in</a>
    <span className="eyebrow">Account recovery</span><h1>Forgot your password?</h1>
    <p className="intro">Enter the email address on your account. We’ll send a link to reset your password.</p>
    {error && <Message kind="error">{error}</Message>}{message && <Message kind="success">{message}</Message>}
    <form onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <button className="button primary" disabled={busy}>{busy ? "Sending…" : "Send reset link"}<span aria-hidden="true">→</span></button>
    </form>
  </div>;
}

function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await post("/api/auth/reset-password", { token, new_password: password });
      setMessage(result.message || "Your password has been reset.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reset your password."); }
    finally { setBusy(false); }
  };

  return <div className="form-content">
    <a className="back-link" href="/">← Back to sign in</a>
    <span className="eyebrow">Choose a new password</span><h1>Reset your password.</h1>
    <p className="intro">Use at least 8 characters. Your other signed-in sessions will be ended.</p>
    {!token && <Message kind="error">This reset link is missing its token. Request a fresh link.</Message>}
    {error && <Message kind="error">{error}</Message>}{message && <Message kind="success">{message}</Message>}
    {message ? <a className="button primary link-button" href="/">Back to sign in <span aria-hidden="true">→</span></a> : <form onSubmit={submit}>
      <label htmlFor="password">New password</label>
      <input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!token} />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required disabled={!token} />
      <button className="button primary" disabled={busy || !token}>{busy ? "Updating…" : "Update password"}<span aria-hidden="true">→</span></button>
    </form>}
  </div>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return <Shell>{path === "/forgot-password" ? <ForgotPassword /> : path === "/reset-password" ? <ResetPassword /> : <Login />}</Shell>;
}

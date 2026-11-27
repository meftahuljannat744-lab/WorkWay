
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const apiBase = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

type ApiResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  user?: {
    full_name?: string;
    email?: string;
  };
};

async function post(
  path: string,
  body: Record<string, string>
): Promise<ApiResponse> {
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
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// Authenticated API helper
async function api(path: string, options: RequestInit = {}): Promise<any> {
  const token = sessionStorage.getItem("workway_token");

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  let response: Response;

  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Could not connect to WorkWay backend.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

function Brand() {
  return (
    <a className="brand" href="/">
      <span className="brand-mark">W</span>
      <span>workway</span>
    </a>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <section className="auth-panel">
        <header className="topbar">
          <Brand />
          <span className="topbar-note">Your next step starts here</span>
        </header>

        {children}

        <footer>
          Discover opportunities. Build skills. Prepare for your career.
        </footer>
      </section>

      <aside className="story-panel">
        <div className="story-orbit orbit-one" />
        <div className="story-orbit orbit-two" />

        <div className="story-content">
          <span className="eyebrow">A clearer path forward</span>
          <h2>Your effort deserves the right opportunity.</h2>
          <p>
            Find work that fits, understand the skills you need,
            and move ahead with confidence.
          </p>

          <div className="story-card">
            <span className="story-card-icon">✳</span>
            <span>
              <strong>One step at a time</strong>
              <small>Make your career journey feel manageable.</small>
            </span>
          </div>
        </div>

        <span className="story-footer">WORKWAY · CAREER DISCOVERY</span>
      </aside>
    </main>
  );
}

function Message({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: string;
}) {
  return (
    <div className={`message ${kind}`} role="status">
      {children}
    </div>
  );
}

// ==============================
// LOGIN
// ==============================

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await post("/api/auth/login", { email, password });

      if (data.token) {
        sessionStorage.setItem("workway_token", data.token);
      }

      setSignedIn(data.user?.full_name || data.user?.email || "your account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (signedIn) {
    return (
      <div className="form-content">
        <span className="success-icon">✓</span>
        <span className="eyebrow">You're signed in</span>
        <h1>Welcome, {signedIn}</h1>
        <p className="intro">Your WorkWay session is ready.</p>

        <a className="button primary link-button" href="/profile">
          Continue to profile <span>→</span>
        </a>

        <button
          className="button secondary"
          onClick={() => {
            sessionStorage.removeItem("workway_token");
            setSignedIn("");
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="form-content">
      <span className="eyebrow">Welcome back</span>
      <h1>Make your next move.</h1>
      <p className="intro">Sign in to continue your career journey.</p>

      {error && <Message kind="error">{error}</Message>}

      <form onSubmit={submit}>
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-label">
          <label htmlFor="login-password">Password</label>
          <a href="/forgot-password">Forgot password?</a>
        </div>

        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="button primary" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
          <span>→</span>
        </button>
      </form>

      <p className="auth-switch">
        Don't have an account? <a href="/register">Create account</a>
      </p>
    </div>
  );
}

// ==============================
// REGISTER
// ==============================

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await post("/api/auth/register", {
        full_name: fullName,
        email,
        mobile,
        password,
      });

      if (data.success) {
        window.location.href =
          `/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-content">
      <a className="back-link" href="/">← Back to sign in</a>
      <span className="eyebrow">Get started</span>
      <h1>Create your account.</h1>
      <p className="intro">Start building your career journey with WorkWay.</p>

      {error && <Message kind="error">{error}</Message>}

      <form onSubmit={submit}>
        <label htmlFor="full-name">Full name</label>
        <input
          id="full-name"
          type="text"
          autoComplete="name"
          maxLength={150}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <label htmlFor="register-email">Email address</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="mobile">Mobile number</label>
        <input
          id="mobile"
          type="tel"
          autoComplete="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="button primary" disabled={busy}>
          {busy ? "Creating account..." : "Create account"}
          <span>→</span>
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <a href="/">Sign in</a>
      </p>
    </div>
  );
}

// ==============================
// EMAIL VERIFICATION
// ==============================

function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const data = await post("/api/otp/verify-email", { email, otp });
      setMessage(data.message || "Email verified successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const data = await post("/api/otp/resend", { email });
      setMessage(data.message || "A new OTP has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend OTP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-content">
      <a className="back-link" href="/register">← Back to registration</a>
      <span className="eyebrow">Email verification</span>
      <h1>Verify your email.</h1>
      <p className="intro">
        Enter the 6-digit verification code sent to {email || "your email"}.
      </p>

      {error && <Message kind="error">{error}</Message>}
      {message && <Message kind="success">{message}</Message>}

      {message.toLowerCase().includes("verified") ||
      message.toLowerCase().includes("already verified") ? (
        <a className="button primary link-button" href="/">
          Continue to sign in <span>→</span>
        </a>
      ) : (
        <>
          <form onSubmit={verify}>
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />

            <button className="button primary" disabled={busy}>
              {busy ? "Verifying..." : "Verify email"}
              <span>→</span>
            </button>
          </form>

          <button
            type="button"
            className="resend-button"
            onClick={resend}
            disabled={busy || !email}
          >
            Resend verification code
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// FORGOT PASSWORD
// ==============================

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const data = await post("/api/auth/forgot-password", { email });
      setMessage(
        data.message ||
        "If an eligible account exists, a reset link has been sent."
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-content">
      <a className="back-link" href="/">← Back to sign in</a>
      <span className="eyebrow">Account recovery</span>
      <h1>Forgot your password?</h1>
      <p className="intro">Enter your account email to request a reset link.</p>

      {error && <Message kind="error">{error}</Message>}
      {message && <Message kind="success">{message}</Message>}

      <form onSubmit={submit}>
        <label htmlFor="forgot-email">Email address</label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button className="button primary" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"}
          <span>→</span>
        </button>
      </form>
    </div>
  );
}

// ==============================
// RESET PASSWORD
// ==============================

function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const data = await post("/api/auth/reset-password", {
        token,
        new_password: password,
      });
      setMessage(data.message || "Password reset successful.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-content">
      <a className="back-link" href="/">← Back to sign in</a>
      <span className="eyebrow">Account recovery</span>
      <h1>Reset your password.</h1>
      <p className="intro">Choose a new password with at least 8 characters.</p>

      {error && <Message kind="error">{error}</Message>}
      {message && <Message kind="success">{message}</Message>}

      {!message && (
        <form onSubmit={submit}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!token}
          />

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={!token}
          />

          <button className="button primary" disabled={busy || !token}>
            {busy ? "Updating..." : "Update password"}
            <span>→</span>
          </button>
        </form>
      )}

      {!token && (
        <Message kind="error">
          Reset token is missing. Request a new link.
        </Message>
      )}
    </div>
  );
}

// ==============================
// REUSABLE PROFILE CRUD SECTION
// ==============================

type FieldConfig = {
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  checkbox?: boolean;
};

function CrudSection({
  title,
  endpoint,
  fields,
}: {
  title: string;
  endpoint: string;
  fields: FieldConfig[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadItems = async () => {
    try {
      const data = await api(endpoint);
      setItems(data.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load data.");
    }
  };

  useEffect(() => {
    void loadItems();
  }, [endpoint]);

  const startAdd = () => {
    setEditingId(null);
    setValues({});
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const startEdit = (item: any) => {
    const next: Record<string, any> = {};
    fields.forEach((field) => {
      next[field.name] = item[field.name] ?? "";
    });
    setValues(next);
    setEditingId(item.id);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const method = editingId ? "PUT" : "POST";
      const path = editingId ? `${endpoint}/${editingId}` : endpoint;

      await api(path, {
        method,
        body: JSON.stringify(values),
      });

      setMessage(editingId ? "Updated successfully." : "Added successfully.");
      setShowForm(false);
      setEditingId(null);
      setValues({});
      await loadItems();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save data.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    setError("");
    setMessage("");

    try {
      await api(`${endpoint}/${id}`, { method: "DELETE" });
      setMessage("Item deleted successfully.");
      await loadItems();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete item.");
    }
  };

  return (
    <section className="profile-card">
      <div className="profile-section-heading">
        <div>
          <h2>{title}</h2>
          <p>Manage your {title.toLowerCase()} information.</p>
        </div>

        <button className="profile-add-button" onClick={startAdd}>
          + Add
        </button>
      </div>

      {error && <Message kind="error">{error}</Message>}
      {message && <Message kind="success">{message}</Message>}

      {showForm && (
        <form className="profile-form" onSubmit={save}>
          <h3>{editingId ? "Edit entry" : "Add new entry"}</h3>

          <div className="profile-form-grid">
            {fields.map((field) => (
              <label className="profile-field" key={field.name}>
                {field.label}

                {field.checkbox ? (
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [field.name]: e.target.checked ? 1 : 0,
                      })
                    }
                  />
                ) : field.multiline ? (
                  <textarea
                    value={values[field.name] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type || "text"}
                    value={values[field.name] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>

          <div className="profile-actions">
            <button className="profile-save-button" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="profile-cancel-button"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="profile-empty">No entries added yet.</p>
      ) : (
        <div className="profile-item-list">
          {items.map((item) => (
            <article className="profile-item" key={item.id}>
              <div>
                <h3>
                  {item.institution ||
                    item.organization_name ||
                    item.title ||
                    item.name}
                </h3>
                <p>
                  {item.degree ||
                    item.job_title ||
                    item.issuing_organization ||
                    ""}
                </p>
                {item.description && <p>{item.description}</p>}
              </div>

              <div className="profile-item-actions">
                <button onClick={() => startEdit(item)}>Edit</button>
                <button onClick={() => remove(item.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ==============================
// SKILLS SECTION
// ==============================

function SkillsSection() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [skillId, setSkillId] = useState("");
  const [proficiency, setProficiency] = useState("BEGINNER");
  const [years, setYears] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSkills = async () => {
    const [catalogData, userData] = await Promise.all([
      api("/api/skills/catalog"),
      api("/api/skills"),
    ]);

    setCatalog(catalogData.skills || []);
    setSkills(userData.skills || []);
  };

  useEffect(() => {
    loadSkills().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Could not load skills.")
    );
  }, []);

  const saveSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!skillId) {
      setError("Please select a skill.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api("/api/skills", {
        method: "POST",
        body: JSON.stringify({
          skill_id: Number(skillId),
          proficiency,
          years_experience: Number(years),
        }),
      });

      setMessage("Skill saved successfully.");
      setSkillId("");
      setProficiency("BEGINNER");
      setYears("0");
      await loadSkills();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save skill.");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkill = async (id: number) => {
    if (!window.confirm("Remove this skill from your profile?")) return;

    try {
      await api(`/api/skills/${id}`, { method: "DELETE" });
      setMessage("Skill removed.");
      await loadSkills();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove skill.");
    }
  };

  return (
    <section className="profile-card">
      <div className="profile-section-heading">
        <div>
          <h2>Skills</h2>
          <p>Add your skills and proficiency levels.</p>
        </div>
      </div>

      {error && <Message kind="error">{error}</Message>}
      {message && <Message kind="success">{message}</Message>}

      <form className="profile-form" onSubmit={saveSkill}>
        <div className="profile-form-grid">
          <label className="profile-field">
            Select skill
            <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
              <option value="">Choose a skill</option>
              {catalog.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.category_name} — {skill.name}
                </option>
              ))}
            </select>
          </label>

          <label className="profile-field">
            Proficiency
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value)}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </label>

          <label className="profile-field">
            Years of experience
            <input
              type="number"
              min="0"
              step="0.5"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </label>
        </div>

        <button className="profile-save-button" disabled={busy}>
          {busy ? "Saving..." : "Add / Update Skill"}
        </button>
      </form>

      <div className="profile-skill-list">
        {skills.length === 0 ? (
          <p className="profile-empty">No skills added yet.</p>
        ) : (
          skills.map((skill) => (
            <div className="profile-skill" key={skill.skill_id}>
              <div>
                <strong>{skill.skill_name}</strong>
                <small>
                  {skill.category_name || "Skill"} · {skill.proficiency || "Not set"}
                  {skill.years_experience != null
                    ? ` · ${skill.years_experience} years`
                    : ""}
                </small>
              </div>
              <button onClick={() => deleteSkill(skill.skill_id)}>Remove</button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ==============================
// PROFILE DASHBOARD
// ==============================

function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadProfile = async () => {
    setBusy(true);
    setError("");

    try {
      const data = await api("/api/profile");
      setProfile(data.profile || {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load profile.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateField = (name: string, value: any) => {
    setProfile((previous) => ({ ...previous, [name]: value }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const fields = [
        "full_name",
        "date_of_birth",
        "gender",
        "professional_title",
        "career_summary",
        "current_location_text",
        "expected_salary_min",
        "expected_salary_max",
        "availability",
      ];

      const body: Record<string, any> = {};
      fields.forEach((field) => {
        body[field] = profile[field] ?? "";
      });

      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setMessage("Personal information saved successfully.");
      await loadProfile();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem("workway_token");
    window.location.href = "/";
  };

  if (busy) {
    return (
      <main className="profile-loading">
        <Brand />
        <p>Loading your WorkWay profile...</p>
      </main>
    );
  }

  const completion = Number(profile.profile_completion || 0);

  return (
    <main className="profile-dashboard">
      <header className="profile-topbar">
        <Brand />
        <div className="profile-topbar-actions">
          <span>{profile.full_name || "WorkWay member"}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="profile-container">
        <section className="profile-welcome">
          <div>
            <span className="eyebrow">YOUR CAREER JOURNEY</span>
            <h1>Build your professional profile.</h1>
            <p>
              Add your background, skills and experience to make your
              WorkWay profile more complete.
            </p>
          </div>

          <div className="profile-progress">
            <strong>{completion}%</strong>
            <span>Profile completion</span>
            <div className="profile-progress-track">
              <div style={{ width: `${Math.min(100, Math.max(0, completion))}%` }} />
            </div>
          </div>
        </section>

        {error && <Message kind="error">{error}</Message>}
        {message && <Message kind="success">{message}</Message>}

        <section className="profile-card">
          <div className="profile-section-heading">
            <div>
              <h2>Personal information</h2>
              <p>Keep your basic profile details up to date.</p>
            </div>
          </div>

          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-form-grid">
              <label className="profile-field">
                Full name
                <input
                  value={profile.full_name || ""}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  required
                />
              </label>

              <label className="profile-field">
                Email address
                <input value={profile.email || ""} disabled />
              </label>

              <label className="profile-field">
                Mobile number
                <input value={profile.mobile || ""} disabled />
              </label>

              <label className="profile-field">
                Date of birth
                <input
                  type="date"
                  value={profile.date_of_birth?.slice(0, 10) || ""}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                />
              </label>

              <label className="profile-field">
                Gender
                <select
                  value={profile.gender || ""}
                  onChange={(e) => updateField("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </label>

              <label className="profile-field">
                Professional title
                <input
                  placeholder="e.g. CSE Student"
                  value={profile.professional_title || ""}
                  onChange={(e) =>
                    updateField("professional_title", e.target.value)
                  }
                />
              </label>

              <label className="profile-field">
                Current location
                <input
                  placeholder="City, Country"
                  value={profile.current_location_text || ""}
                  onChange={(e) =>
                    updateField("current_location_text", e.target.value)
                  }
                />
              </label>

              <label className="profile-field">
                Availability
                <select
                  value={profile.availability || ""}
                  onChange={(e) => updateField("availability", e.target.value)}
                >
                  <option value="">Select availability</option>
                  <option value="IMMEDIATELY">Immediately</option>
                  <option value="WITHIN_2_WEEKS">Within 2 weeks</option>
                  <option value="WITHIN_A_MONTH">Within a month</option>
                  <option value="NOT_AVAILABLE">Not available</option>
                </select>
              </label>

              <label className="profile-field">
                Expected minimum salary
                <input
                  type="number"
                  min="0"
                  value={profile.expected_salary_min ?? ""}
                  onChange={(e) =>
                    updateField("expected_salary_min", e.target.value)
                  }
                />
              </label>

              <label className="profile-field">
                Expected maximum salary
                <input
                  type="number"
                  min="0"
                  value={profile.expected_salary_max ?? ""}
                  onChange={(e) =>
                    updateField("expected_salary_max", e.target.value)
                  }
                />
              </label>

              <label className="profile-field profile-full-width">
                Career summary
                <textarea
                  rows={5}
                  placeholder="Write a short professional introduction..."
                  value={profile.career_summary || ""}
                  onChange={(e) =>
                    updateField("career_summary", e.target.value)
                  }
                />
              </label>
            </div>

            <button className="profile-save-button" disabled={saving}>
              {saving ? "Saving..." : "Save personal information"}
            </button>
          </form>
        </section>

        <CrudSection
          title="Education"
          endpoint="/api/educations"
          fields={[
            { name: "institution", label: "Institution", },
            { name: "degree", label: "Degree" },
            { name: "field_of_study", label: "Field of study" },
            { name: "result_text", label: "Result / CGPA" },
            { name: "start_date", label: "Start date", type: "date" },
            { name: "end_date", label: "End date", type: "date" },
            { name: "is_current", label: "Currently studying", checkbox: true },
            { name: "description", label: "Description", multiline: true },
          ]}
        />

        <CrudSection
          title="Experience"
          endpoint="/api/experiences"
          fields={[
            { name: "organization_name", label: "Organization" },
            { name: "job_title", label: "Job title" },
            { name: "employment_type", label: "Employment type" },
            { name: "location_text", label: "Location" },
            { name: "start_date", label: "Start date", type: "date" },
            { name: "end_date", label: "End date", type: "date" },
            { name: "is_current", label: "Currently working", checkbox: true },
            { name: "description", label: "Description", multiline: true },
          ]}
        />

        <CrudSection
          title="Projects"
          endpoint="/api/projects"
          fields={[
            { name: "title", label: "Project title" },
            { name: "project_url", label: "Project URL", type: "url" },
            { name: "repository_url", label: "Repository URL", type: "url" },
            { name: "start_date", label: "Start date", type: "date" },
            { name: "end_date", label: "End date", type: "date" },
            { name: "description", label: "Description", multiline: true },
          ]}
        />

        <CrudSection
          title="Certifications"
          endpoint="/api/certifications"
          fields={[
            { name: "name", label: "Certification name" },
            { name: "issuing_organization", label: "Issuing organization" },
            { name: "issue_date", label: "Issue date", type: "date" },
            { name: "expiry_date", label: "Expiry date", type: "date" },
            { name: "credential_id", label: "Credential ID" },
            { name: "credential_url", label: "Credential URL", type: "url" },
          ]}
        />

        <SkillsSection />

        <footer className="profile-footer">
          WorkWay · Discover opportunities. Build skills. Prepare for your career.
        </footer>
      </div>
    </main>
  );
}

// ==============================
// APP ROUTING
// ==============================

export default function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/profile") {
    if (!sessionStorage.getItem("workway_token")) {
      return <Shell><Login /></Shell>;
    }

    return <ProfilePage />;
  }

  let page: ReactNode;

  switch (path) {
    case "/register":
      page = <Register />;
      break;
    case "/verify-email":
      page = <VerifyEmail />;
      break;
    case "/forgot-password":
      page = <ForgotPassword />;
      break;
    case "/reset-password":
      page = <ResetPassword />;
      break;
    default:
      page = <Login />;
  }

  return <Shell>{page}</Shell>;
}

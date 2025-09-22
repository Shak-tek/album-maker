import React, { useState, useEffect } from "react";
import "./AdminLogin.css";

const INITIAL_FORM = { email: "", password: "" };

export default function AdminLogin({ onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "FlipSnip Admin | Sign in";
    return () => {
      document.title = previous;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/.netlify/functions/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      if (!response.ok) {
        const message = response.status === 401 || response.status === 403
          ? "Invalid admin credentials"
          : "Unable to sign in right now";
        setError(message);
        return;
      }

      const payload = await response.json();
      if (payload?.admin) {
        onSuccess(payload.admin);
        setForm(INITIAL_FORM);
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      setError("Network error. Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__panel">
        <div className="admin-login__brand">
          <span className="admin-login__logo" aria-hidden="true">FS</span>
          <div>
            <div className="admin-login__title">FlipSnip Admin</div>
            <div className="admin-login__subtitle">Authorized personnel only</div>
          </div>
        </div>

        <form className="admin-login__form" onSubmit={handleSubmit}>
          <label className="admin-login__field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@flipsnip.co"
              disabled={isSubmitting}
              required
            />
          </label>
          <label className="admin-login__field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="????????"
              disabled={isSubmitting}
              required
            />
          </label>
          {error ? <div className="admin-login__error">{error}</div> : null}
          <button
            type="submit"
            className="admin-login__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in?" : "Sign in"}
          </button>
        </form>

        <div className="admin-login__footer">
          Having trouble? <a href="mailto:support@flipsnip.co">Contact support</a>
        </div>
        <div className="admin-login__footer">
          <a href="/">Return to customer site</a>
        </div>
      </div>
    </div>
  );
}

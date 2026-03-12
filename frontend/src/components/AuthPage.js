import React, { useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import "../styles/designSystem.css";
import { API_BASE } from "../lib/api";

const API = API_BASE;

export default function AuthPage({ onLogin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isResetMode = useMemo(() => location.pathname === "/reset-password", [location.pathname]);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState(new URLSearchParams(location.search).get("token") || "");

  const parseError = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    return fallback;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "register" && !username) {
      setError("Please choose a username.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? `${API}/auth/login` : `${API}/auth/register`;
      const payload = mode === "login" ? { email, password } : { username, email, password };
      const response = await axios.post(endpoint, payload);

      const { token, username: loggedInUsername } = response.data;
      onLogin?.(token, loggedInUsername);
    } catch (err) {
      setError(parseError(err, mode === "login" ? "Login failed." : "Registration failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!resetToken || !password) {
      setError("Reset token and new password are required.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token: resetToken,
        new_password: password,
      });
      setSuccess("Password reset successful. You can now log in.");
      setTimeout(() => navigate("/auth"), 1200);
    } catch (err) {
      setError(parseError(err, "Password reset failed."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--rq-bg-main)",
      }}
    >
      <div
        className="rq-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          display: "grid",
          gap: "18px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 className="rq-title">
            {isResetMode ? "Reset Password" : mode === "login" ? "Login" : "Create Account"}
          </h2>
          <p className="rq-muted">
            {isResetMode
              ? "Set a new password for your account"
              : mode === "login"
                ? "Access your Rookie Quest dashboard"
                : "Start your Rookie Quest journey"}
          </p>
        </div>

        <form onSubmit={isResetMode ? handleResetSubmit : handleAuthSubmit} style={{ display: "grid", gap: "14px" }}>
          {isResetMode ? (
            <>
              <input
                type="text"
                placeholder="Reset token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "var(--rq-bg-panel-soft)",
                  color: "var(--rq-text-main)",
                }}
              />
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "var(--rq-bg-panel-soft)",
                  color: "var(--rq-text-main)",
                }}
              />
            </>
          ) : (
            <>
              {mode === "register" && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "var(--rq-bg-panel-soft)",
                    color: "var(--rq-text-main)",
                  }}
                />
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "var(--rq-bg-panel-soft)",
                  color: "var(--rq-text-main)",
                }}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "var(--rq-bg-panel-soft)",
                  color: "var(--rq-text-main)",
                }}
              />
            </>
          )}

          {error && (
            <div
              style={{
                color: "#ff8e8e",
                background: "rgba(231,76,60,0.12)",
                border: "1px solid rgba(231,76,60,0.22)",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                color: "#6ee7b7",
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.24)",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              {success}
            </div>
          )}

          <button className="rq-button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isResetMode
                ? "Reset Password"
                : mode === "login"
                  ? "Login"
                  : "Create Account"}
          </button>
        </form>

        {!isResetMode && (
          <div style={{ textAlign: "center" }}>
            <button className="rq-button-secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create new account" : "Already have an account?"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function signUp() {
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email to verify your account.");
  }

  async function googleLogin() {
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">Ricky AI</div>

        <h1>Welcome back</h1>

        <p className="login-subtitle">
          Your personal AI assistant and life intelligence platform.
        </p>

        <button className="google-button" onClick={googleLogin}>
          Continue with Google
        </button>

        <div className="divider">
          <span>or continue with email</span>
        </div>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary-button" onClick={signIn}>
          Sign in
        </button>

        <button className="secondary-button" onClick={signUp}>
          Create account
        </button>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </main>
  );
}

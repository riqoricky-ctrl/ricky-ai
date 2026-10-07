"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  useEffect(() => {
    async function handleAuth() {
      const { error } = await supabase.auth.getSession();

      if (error) {
        window.location.href = "/login";
        return;
      }

      window.location.href = "/";
    }

    handleAuth();
  }, []);

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-logo">Ricky AI</div>
        <h1>Signing you in...</h1>
        <p className="login-subtitle">
          Please wait while we finish your authentication.
        </p>
      </div>
    </main>
  );
}

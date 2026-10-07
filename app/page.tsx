"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <div className="logo">Ricky AI</div>
          <div className="tagline">Your personal intelligence layer</div>
        </div>

        <button
  className="profile"
  onClick={() => (window.location.href = "/login")}
>
  Sign in
</button>
      </header>

      <section className="hero">
        <p className="eyebrow">WELCOME BACK</p>

        <h1>
          Think clearer.
          <br />
          <span>Build your life.</span>
        </h1>

        <p className="intro">
          An AI that remembers what matters, understands your direction,
          and helps you turn thoughts into action.
        </p>
      </section>

      <section className="cards">
        <div className="card">
          <h2>🧠 AI Memory</h2>
          <p>Your conversations and important information can become useful long-term memory.</p>
          <button>Open Memory</button>
        </div>

        <div className="card">
          <h2>🪞 Life Mirror</h2>
          <p>See patterns in your thoughts, decisions, goals and habits.</p>
          <button>Open Mirror</button>
        </div>

        <div className="card">
          <h2>🧬 Life DNA</h2>
          <p>Build a deeper picture of who you are and what drives you.</p>
          <button>Discover DNA</button>
        </div>
      </section>

      <section className="chat">
        <div className="chat-title">Ask Ricky AI</div>

        <div className="chat-box">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What are you thinking about?"
          />

          <button onClick={() => setMessage("")}>
            Send
          </button>
        </div>
      </section>
    </main>
  );
}

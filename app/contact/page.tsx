"use client";
import { useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";
import AppFooter from "@/app/components/AppFooter";

// app/contact/page.tsx — REDESIGNED: front-page colours + WORKING form
// WHAT WAS WRONG:
//  1) Navy header / black form — now emerald #17372f + gold #e9c981 + cream #f8f6ef.
//  2) "Failed to send message" — the form posted to /api/contact which was
//     missing/crashing. This page posts to the new /api/contact route and
//     shows the REAL error the API returns, plus a mailto fallback if the
//     API is ever unreachable (so a message is never trapped).

const GOLD = "#e9c981";
const EMERALD = "#17372f";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setStatus("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d.error || "Could not send right now.");
      setStatus("sent");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Could not send right now.");
    }
  }

  const input: React.CSSProperties = { width: "100%", padding: "13px 16px", borderRadius: 14, border: "1px solid #dfe3d8", background: "#fff", fontSize: 15, color: "#1d3029", outline: "none" };
  const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: "#60745e", marginBottom: 8 };

  return (
    <div style={{ background: "#f8f6ef", minHeight: "100vh" }}>
      <SiteHeader />
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", color: "#a9852e" }}>WE&apos;D LOVE TO HEAR FROM YOU</p>
        <h1 style={{ textAlign: "center", fontFamily: "Georgia, serif", fontSize: 36, color: EMERALD, margin: "10px 0 8px" }}>Contact Us</h1>
        <p style={{ textAlign: "center", color: "#687568", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.7 }}>
          A question, a prayer request, or you need to see the pastor? Send us a message — it comes straight to the ministry team.
        </p>

        <div style={{ maxWidth: 640, margin: "0 auto", background: "#fff", border: "1px solid #e8e7de", borderRadius: 24, padding: 28, boxShadow: "0 18px 50px -30px rgba(23,55,47,0.4)" }}>
          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 44 }}>✅</div>
              <h2 style={{ color: EMERALD }}>Message sent!</h2>
              <p style={{ color: "#687568", lineHeight: 1.7 }}>Thank you — your message has been received. The ministry team will get back to you soon.</p>
              <button onClick={() => setStatus("idle")} style={{ marginTop: 14, cursor: "pointer", background: EMERALD, color: "#fff", border: "none", borderRadius: 999, padding: "11px 22px", fontWeight: 700 }}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <label style={label}>YOUR NAME *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" style={{ ...input, marginBottom: 18 }} />
              <label style={label}>EMAIL ADDRESS *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" style={{ ...input, marginBottom: 18 }} />
              <label style={label}>SUBJECT</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" style={{ ...input, marginBottom: 18 }} />
              <label style={label}>MESSAGE *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="Write your message here…" style={{ ...input, resize: "vertical", marginBottom: 18 }} />
              {status === "error" && (
                <div style={{ background: "#fdecec", border: "1px solid #f5c6c6", color: "#991b1b", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 14 }}>
                  {error}
                  <div style={{ marginTop: 8 }}>
                    Couldn&apos;t reach the server?{" "}
                    <a href={`mailto:?subject=${encodeURIComponent("Contact: " + (subject || name))}&body=${encodeURIComponent(message + "\n\n— " + name + " (" + email + ")")}`} style={{ color: "#991b1b", fontWeight: 800 }}>Send it by email instead →</a>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => { setName(""); setEmail(""); setSubject(""); setMessage(""); setError(""); setStatus("idle"); }} style={{ flex: 1, cursor: "pointer", background: "#f8f6ef", border: "1px solid #e8e7de", borderRadius: 999, padding: "13px", fontWeight: 700, color: "#1d3029" }}>Cancel</button>
                <button type="submit" disabled={status === "sending"} style={{ flex: 1, cursor: "pointer", background: GOLD, border: "none", borderRadius: 999, padding: "13px", fontWeight: 800, color: "#1c352d", opacity: status === "sending" ? 0.6 : 1 }}>
                  {status === "sending" ? "Sending…" : "Send Message"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

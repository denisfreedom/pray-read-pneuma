"use client";

import { useEffect } from "react";

export default function VisitorTracker() {
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        let sessionId = localStorage.getItem("prayread_session");
        if (!sessionId) {
          sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("prayread_session", sessionId);
        }
        await fetch("/api/visitor-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, country: "Unknown", city: "Unknown" }),
        });
      } catch (e) {
        // tracker must never break the page
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, []);

  return null;
}

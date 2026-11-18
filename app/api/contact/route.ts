import { NextResponse } from "next/server";
// app/api/contact/route.ts — NEW: this route was missing / crashing, so the
// Contact form always showed "Failed to send message".
// WHAT IT DOES:
//  - Accepts POST { name, email, subject, message } from the Contact form.
//  - Validates: name + a real-looking email + message are required.
//  - Stores the message in memory (Vercel has no writable disk) AND logs it
//    to the Vercel function logs, so it is never silently lost.
//  - ALWAYS returns { ok: true } on success, { ok:false, error } on bad input
//    — never a 404, never a 500 with no body.
// TO READ MESSAGES: GET /api/contact returns the stored messages (admin use).
//    If you later add email (Resend / Gmail), send the email here and keep
//    this same shape — the form already expects { ok: true }.

export const dynamic = "force-dynamic";

type Msg = { name: string; email: string; subject: string; message: string; at: string };
function store(): Msg[] {
  const g = globalThis as unknown as { __prbContact?: Msg[] };
  if (!g.__prbContact) g.__prbContact = [];
  return g.__prbContact;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || body.yourName || "").trim();
    const email = String(body.email || body.emailAddress || "").trim();
    const subject = String(body.subject || "Contact form").trim();
    const message = String(body.message || body.text || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
    if (!message) return NextResponse.json({ ok: false, error: "Please write your message." }, { status: 400 });
    const entry: Msg = { name, email, subject, message, at: new Date().toISOString() };
    store().unshift(entry);
    // Visible in Vercel -> Logs, so the ministry can see every message.
    console.log("[CONTACT]", JSON.stringify(entry));
    return NextResponse.json({ ok: true, message: "Message received. Thank you — we will get back to you soon." }, { status: 200 });
  } catch (e: any) {
    console.error("[CONTACT ERROR]", e);
    return NextResponse.json({ ok: false, error: "Could not send right now. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, count: store().length, messages: store().slice(0, 50) }, { status: 200 });
}

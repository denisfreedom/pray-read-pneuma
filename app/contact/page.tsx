'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import AppNavbar from '@/app/components/AppNavbar';

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => router.push('/'), 3000);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07070d', color: '#fff' }}>

      <AppNavbar />

      <main className="flex-grow">
        {/* Hero band */}
        <div className="text-center py-14 px-5" style={{ background: 'linear-gradient(180deg, rgba(201,168,76,0.06) 0%, transparent 100%)' }}>
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#f0d080' }}>
            ✉ Get In Touch
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Contact{' '}
            <span style={{ background: 'linear-gradient(135deg,#c9a84c,#f0d080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Pastor Denis
            </span>
          </h1>
          <p className="text-white/45 text-sm sm:text-base max-w-md mx-auto">
            We'd love to hear from you. Reach out with questions, prayer requests, or feedback.
          </p>
          <a href="mailto:pastordenisfreedom@gmail.com"
            className="inline-block mt-4 text-sm transition-colors hover:text-[#f0d080]"
            style={{ color: '#c9a84c' }}>
            pastordenisfreedom@gmail.com
          </a>
        </div>

        {/* Form card */}
        <div className="max-w-xl mx-auto px-5 sm:px-8 pb-16">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="p-6 sm:p-8">
              {success ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
                  <p className="text-white/50 text-sm">Thank you for contacting us. We'll get back to you soon.</p>
                  <p className="text-white/30 text-xs mt-3">Redirecting to home…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { id: 'name', label: 'Your Name', type: 'text', placeholder: 'John Doe', required: true },
                    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true },
                    { id: 'subject', label: 'Subject', type: 'text', placeholder: 'How can we help?', required: false },
                  ].map(f => (
                    <div key={f.id}>
                      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">{f.label} {f.required && '*'}</label>
                      <input
                        type={f.type}
                        required={f.required}
                        value={(formData as Record<string, string>)[f.id]}
                        onChange={e => setFormData({ ...formData, [f.id]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us what's on your mind…"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all resize-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-xl text-sm text-red-300"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => router.push('/')}
                      className="flex-1 px-5 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={loading}
                      className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #c9a84c, #f0d080)', color: '#07070d' }}>
                      {loading ? 'Sending…' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

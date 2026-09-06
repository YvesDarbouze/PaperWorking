'use client';

import { useState } from 'react';

const CATEGORIES = [
  { value: 'general-inquiry', label: 'General inquiry' },
  { value: 'sales', label: 'Sales & pricing' },
  { value: 'support', label: 'Product support' },
  { value: 'billing', label: 'Billing' },
] as const;

type FormState = {
  name: string;
  email: string;
  subject: string;
  body: string;
  category: string;
};

const INITIAL: FormState = {
  name: '',
  email: '',
  subject: '',
  body: '',
  category: 'general-inquiry',
};

export default function ContactInquiryForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim(),
          subject: form.subject.trim(),
          body: form.body.trim(),
          category: form.category,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        message?: string;
        ticketId?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error || 'Unable to send message. Please try again.');
        return;
      }

      setSuccess(data.message || 'Thank you — we received your message.');
      setForm(INITIAL);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#00DD94]';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor="contact-name" className="block space-y-1.5">
          <span className="text-xs font-semibold text-white/70">Name</span>
          <input
            id="contact-name"
            type="text"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Your name"
            className={fieldClass}
          />
        </label>
        <label htmlFor="contact-email" className="block space-y-1.5">
          <span className="text-xs font-semibold text-white/70">
            Email <span className="text-[#00DD94]">*</span>
          </span>
          <input
            id="contact-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="you@company.com"
            className={fieldClass}
          />
        </label>
      </div>

      <label htmlFor="contact-category" className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/70">Category</span>
        <select
          id="contact-category"
          name="category"
          value={form.category}
          onChange={(e) => updateField('category', e.target.value)}
          className={fieldClass}
        >
          {CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#121016]">
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="contact-subject" className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/70">
          Subject <span className="text-[#00DD94]">*</span>
        </span>
        <input
          id="contact-subject"
          type="text"
          name="subject"
          required
          value={form.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="How can we help?"
          className={fieldClass}
        />
      </label>

      <label htmlFor="contact-message" className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/70">
          Message <span className="text-[#00DD94]">*</span>
        </span>
        <textarea
          id="contact-message"
          name="body"
          required
          rows={5}
          value={form.body}
          onChange={(e) => updateField('body', e.target.value)}
          placeholder="Tell us about your deal, team, or question…"
          className={`${fieldClass} resize-y min-h-[120px]`}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-[#00DD94]/30 bg-[#00DD94]/10 px-3 py-2 text-sm text-[#7dd3c0]">
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="pw-pill-cta inline-flex disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send message'}
        </button>
        <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          Or email{' '}
          <a href="mailto:hi@paperworking.co" className="underline-offset-2 hover:underline">
            hi@paperworking.co
          </a>{' '}
          directly.
        </p>
      </div>
    </form>
  );
}

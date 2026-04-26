'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  Plus,
  Minus,
  BookOpen,
  Mail,
  Activity,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  ChevronRight,
  Search,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Support Page — /support  (content only)

   This component is mounted INSIDE <SupportLayout> which
   provides the header, footer, and max-w-7xl container.
   Every section here flows in a single-column vertical
   scroll architecture.

   Sections:
   1. Hero banner
   2. Quick-help resource cards
   3. Contact form
   4. FAQ accordion
   5. System status strip
   ═══════════════════════════════════════════════════════ */

/* ── FAQ Data ── */
const SUPPORT_FAQS = [
  {
    question: 'How do I reset my password?',
    answer:
      'Click "Sign-in" from the homepage, then select "Forgot password" beneath the email field. You\'ll receive a reset link within seconds. If you don\'t see it, check your spam folder.',
  },
  {
    question: 'Can I upgrade or downgrade my plan at any time?',
    answer:
      'Absolutely. Navigate to Settings → Billing inside your dashboard. Plan changes take effect immediately, and we prorate the difference on your next invoice — no penalty, no lock-in.',
  },
  {
    question: 'How do I invite team members or investors?',
    answer:
      'From any deal card, click the share icon to generate a secure investor link. For team members, go to Settings → Team and enter their email. They\'ll receive a role-based invitation instantly.',
  },
  {
    question: 'Is my data encrypted and secure?',
    answer:
      'Yes. All data is encrypted at rest (AES-256) and in transit (TLS 1.3) using Google Cloud / Firebase infrastructure. We never sell or share your deal data. See our Privacy Mandates for full details.',
  },
  {
    question: 'What file formats can I upload for documents?',
    answer:
      'PaperWorking accepts PDF, DOCX, XLSX, PNG, JPG, and HEIC. Individual files are capped at 25 MB. HUD-1 / Closing Disclosure uploads are processed through the Engine Room module.',
  },
  {
    question: 'How do I export financial reports?',
    answer:
      'Open the Engine Room → Financial Statements tab, select the report type (P&L, Cash Flow, Balance Sheet), set the date range, and click "Export." We support both PDF and CSV formats.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'We offer a full-featured 14-day trial on the Pro plan. No credit card required. At the end of the trial, you can choose to subscribe or your account will revert to the free Starter tier.',
  },
];

/* ── Quick-help cards ── */
const RESOURCES = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Guides, tutorials, and API reference for every feature.',
    href: '/how-it-works',
    cta: 'Browse docs',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Talk to our AI assistant or a human agent in real time.',
    href: '#contact',
    cta: 'Start chat',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Reach us at support@paperworking.co — response within 4 hrs.',
    href: 'mailto:support@paperworking.co',
    cta: 'Send email',
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    description: 'Learn how we protect your data and comply with regulations.',
    href: '/privacy',
    cta: 'Read policy',
  },
];

/* ── Entrance animation variants ── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] },
  },
};

/* ═══════════════════════════════════════════════════════ */

export default function SupportPage() {
  /* ── FAQ accordion state ── */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  /* ── Contact form state ── */
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate network request
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSubmitted(true);
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════
          § 1 — Hero
          Single-column, centred, inherits max-w from layout
         ══════════════════════════════════════════════════ */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeUp}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] hover:text-[var(--pw-black)] transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl tracking-tighter text-[var(--pw-black)] mb-6"
          >
            How can we help?
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-[var(--pw-subtle)] max-w-xl mx-auto leading-relaxed mb-10"
          >
            Search our knowledge base, reach out to our team, or explore common
            questions below.
          </motion.p>

          <motion.div variants={fadeUp} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-[var(--pw-muted)]" />
            </div>
            <input
              type="text"
              aria-label="Search support documentation"
              placeholder="Search guides, SOPs, and technical documentation..."
              className="w-full h-16 sm:h-20 pl-14 pr-6 rounded-2xl bg-[var(--pw-surface)] border border-[var(--pw-border)] text-base sm:text-lg text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] focus:ring-1 focus:ring-[var(--pw-black)] transition-all shadow-sm"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2 — Quick-Help Resource Cards
         ══════════════════════════════════════════════════ */}
      <section className="pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {RESOURCES.map((r) => (
            <motion.div key={r.title} variants={fadeUp}>
              <Link
                href={r.href}
                className="group block bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-7 h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--pw-bg)] flex items-center justify-center mb-5 group-hover:bg-[var(--pw-black)] transition-colors duration-300">
                  <r.icon className="w-5 h-5 text-[var(--pw-subtle)] group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-base font-semibold text-[var(--pw-black)] mb-2">
                  {r.title}
                </h3>
                <p className="text-sm text-[var(--pw-muted)] leading-relaxed mb-4">
                  {r.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--pw-subtle)] group-hover:text-[var(--pw-black)] transition-colors">
                  {r.cta}
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 3 + § 4 — Contact Form + FAQ (side-by-side on desktop)
          Still single-column in the DOM flow; the two-col
          grid is an INTERNAL layout within this section.
         ══════════════════════════════════════════════════ */}
      <section id="contact" className="pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* ── Left: Contact Form ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--pw-muted)] mb-3"
            >
              Get in Touch
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl tracking-tighter text-[var(--pw-black)] mb-8"
            >
              Send us a message
            </motion.h2>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-10 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-[var(--pw-black)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--pw-black)] mb-2">
                    Message received
                  </h3>
                  <p className="text-sm text-[var(--pw-muted)] mb-6">
                    We&apos;ll get back to you within 4 business hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="ag-button-secondary ag-button text-sm"
                  >
                    Send another
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  ref={formRef}
                  onSubmit={handleSubmit}
                  variants={stagger}
                  className="space-y-5"
                >
                  {/* Name */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-name"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="support-name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                    />
                  </motion.div>

                  {/* Email */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-email"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="support-email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="jane@company.co"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors"
                    />
                  </motion.div>

                  {/* Subject */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-subject"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Subject
                    </label>
                    <select
                      id="support-subject"
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] focus:outline-none focus:border-[var(--pw-black)] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled>
                        Select a topic…
                      </option>
                      <option value="billing">Billing &amp; Subscriptions</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account &amp; Access</option>
                      <option value="feature">Feature Request</option>
                      <option value="partnership">Partnership Inquiry</option>
                      <option value="other">Other</option>
                    </select>
                  </motion.div>

                  {/* Message */}
                  <motion.div variants={fadeUp}>
                    <label
                      htmlFor="support-message"
                      className="block text-xs font-bold uppercase tracking-widest text-[var(--pw-muted)] mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="support-message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe your issue or question…"
                      className="w-full bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] px-4 py-3 text-sm text-[var(--pw-black)] placeholder:text-[var(--pw-muted)] focus:outline-none focus:border-[var(--pw-black)] transition-colors resize-none"
                    />
                  </motion.div>

                  {/* Submit */}
                  <motion.div variants={fadeUp}>
                    <button
                      type="submit"
                      disabled={sending}
                      className="ag-button w-full sm:w-auto text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Message
                        </span>
                      )}
                    </button>
                  </motion.div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Right: FAQ Accordion ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--pw-muted)] mb-3"
            >
              Common Questions
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl tracking-tighter text-[var(--pw-black)] mb-8"
            >
              FAQ
            </motion.h2>

            <motion.div variants={stagger} className="space-y-3">
              {SUPPORT_FAQS.map((faq, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-sm)] overflow-hidden"
                >
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-[var(--pw-bg)] transition-colors cursor-pointer"
                    aria-expanded={openIndex === i}
                  >
                    <span className="text-sm font-semibold text-[var(--pw-black)] pr-4">
                      {faq.question}
                    </span>
                    <span className="shrink-0">
                      {openIndex === i ? (
                        <Minus className="w-4 h-4 text-[var(--pw-black)]" />
                      ) : (
                        <Plus className="w-4 h-4 text-[var(--pw-muted)]" />
                      )}
                    </span>
                  </button>
                  <AnimatePresence>
                    {openIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.19, 1, 0.22, 1],
                        }}
                      >
                        <div className="px-5 pb-5 text-sm text-[var(--pw-subtle)] leading-relaxed border-t border-[var(--pw-border)] pt-4">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5 — System Status Strip
         ══════════════════════════════════════════════════ */}
      <section className="pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          className="bg-[var(--pw-surface)] border border-[var(--pw-border)] rounded-[var(--radius-lg)] p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--pw-black)]">
                All Systems Operational
              </h3>
              <p className="text-xs text-[var(--pw-muted)] mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Last checked: just now
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--pw-muted)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              API
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Dashboard
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Auth
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Storage
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}

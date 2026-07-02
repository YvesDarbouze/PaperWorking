/**
 * This page is never reached — /faq is permanently redirected to
 * /support/faq?category=industry-data at the config level (next.config.ts).
 *
 * This file exists only as a fallback safety net.
 */
import { redirect } from 'next/navigation';

export default function FAQRedirect() {
  redirect('/support/faq?category=industry-data');
}

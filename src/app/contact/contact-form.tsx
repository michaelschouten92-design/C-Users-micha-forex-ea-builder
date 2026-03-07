"use client";

import { useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = "Something went wrong";
        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch {
          // Non-JSON response (e.g., server error page)
        }
        throw new Error(errorMessage);
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(16,185,129,0.15)] flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#10B981]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[#FAFAFA] font-medium">Message sent!</p>
        <p className="text-sm text-[#A1A1AA] mt-1">We&apos;ll get back to you within 24 hours.</p>
        <button
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setSubject("");
            setMessage("");
          }}
          className="text-sm text-[#71717A] hover:text-[#FAFAFA] mt-3 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#EF4444] p-3 rounded-lg text-sm"
        >
          {error}
        </div>
      )}
      <fieldset disabled={loading} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact-name" className="block text-sm font-medium text-[#A1A1AA] mb-1">
              Name<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#FAFAFA] placeholder-[#71717A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-[#A1A1AA] mb-1"
            >
              Email<span className="text-red-400 ml-0.5">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#FAFAFA] placeholder-[#71717A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="contact-subject"
            className="block text-sm font-medium text-[#A1A1AA] mb-1"
          >
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#FAFAFA] placeholder-[#71717A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors"
            placeholder="What's this about?"
          />
        </div>
        <div>
          <label
            htmlFor="contact-message"
            className="block text-sm font-medium text-[#A1A1AA] mb-1"
          >
            Message<span className="text-red-400 ml-0.5">*</span>
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2.5 bg-[#18181B] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#FAFAFA] placeholder-[#71717A] text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition-colors resize-none"
            placeholder="Tell us how we can help..."
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#6366F1] text-white py-2.5 rounded-lg font-medium hover:bg-[#818CF8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </fieldset>
    </form>
  );
}

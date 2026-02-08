"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const mailtoSubject = encodeURIComponent(subject || "AlgoStudio Contact");
    const mailtoBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:contact@algo-studio.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(34,211,238,0.15)] flex items-center justify-center">
          <svg
            className="w-6 h-6 text-[#22D3EE]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-medium">Your email client should have opened.</p>
        <p className="text-sm text-[#94A3B8] mt-1">
          Didn&apos;t work?{" "}
          <a href="mailto:contact@algo-studio.com" className="text-[#A78BFA] hover:underline">
            Email us directly
          </a>
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-[#64748B] hover:text-white mt-3 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-[#CBD5E1] mb-1">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-[#CBD5E1] mb-1">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="block text-sm font-medium text-[#CBD5E1] mb-1">
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all"
          placeholder="What's this about?"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-[#CBD5E1] mb-1">
          Message *
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          className="w-full px-3 py-2.5 bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-white placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent transition-all resize-none"
          placeholder="Tell us how we can help..."
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#4F46E5] text-white py-2.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.25)]"
      >
        Send Message
      </button>
    </form>
  );
}

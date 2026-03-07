interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  questions: FAQItem[];
}

export function FAQSection({ questions }: FAQSectionProps) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-10 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {questions.map((item, i) => (
            <details
              key={i}
              className="group bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-[#FAFAFA] font-medium text-sm list-none">
                {item.q}
                <svg
                  className="w-5 h-5 text-[#71717A] group-open:rotate-180 transition-transform flex-shrink-0 ml-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-4 text-sm text-[#A1A1AA] leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function faqJsonLd(questions: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

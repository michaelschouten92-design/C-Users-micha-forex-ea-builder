import Link from "next/link";

interface CTASectionProps {
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
}

export function CTASection({
  title,
  description,
  ctaText = "Start Validating — Free",
  ctaHref = "/login?mode=register",
}: CTASectionProps) {
  return (
    <section className="py-20 px-6 border-t border-[rgba(79,70,229,0.1)]">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
        <p className="text-[#94A3B8] mb-8">{description}</p>
        <Link
          href={ctaHref}
          className="inline-block bg-[#4F46E5] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#6366F1] transition-all duration-200 hover:shadow-[0_0_24px_rgba(79,70,229,0.4)]"
        >
          {ctaText}
        </Link>
        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg max-w-xl mx-auto">
          <p className="text-xs text-amber-300/90 leading-relaxed">
            <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk of
            loss and is not suitable for every investor. Past performance does not guarantee future
            results. Always test strategies on a demo account first. AlgoStudio is a strategy
            validation platform — it does not provide financial advice or guarantee profits. See our{" "}
            <Link href="/terms" className="underline hover:text-amber-200">
              Terms of Service
            </Link>{" "}
            for full details.
          </p>
        </div>
      </div>
    </section>
  );
}

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
  ctaText = "Start monitoring",
  ctaHref = "/register",
}: CTASectionProps) {
  return (
    <section className="py-20 px-6 border-t border-[rgba(255,255,255,0.06)]">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-[#FAFAFA] mb-4">{title}</h2>
        <p className="text-[#A1A1AA] mb-8">{description}</p>
        <Link
          href={ctaHref}
          className="inline-block bg-[#6366F1] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#818CF8] transition-colors"
        >
          {ctaText}
        </Link>
        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg max-w-xl mx-auto">
          <p className="text-xs text-amber-300/90 leading-relaxed">
            <strong>Risk Warning:</strong> Trading in financial markets involves substantial risk of
            loss and is not suitable for every investor. Past performance does not guarantee future
            results. Always test strategies on a demo account first. Algo Studio is a monitoring and
            governance platform — it does not provide financial advice or guarantee profits. See our{" "}
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

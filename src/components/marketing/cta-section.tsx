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
  ctaText = "Start Building Free",
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
      </div>
    </section>
  );
}

import { PROP_FIRMS, getPropFirmBySlug } from "@/data/prop-firms";
import { renderClusterOG, OG_SIZE } from "@/lib/og/cluster-og";

export const runtime = "edge";
export const alt = "Prop firm EA rules guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): Array<{ slug: string }> {
  return PROP_FIRMS.map((f) => ({ slug: f.slug }));
}

export default async function PropFirmOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const firm = getPropFirmBySlug(slug);
  if (!firm) {
    return renderClusterOG({
      title: "Prop Firm Guide",
      label: "Algo Studio",
    });
  }
  return renderClusterOG({
    title: `${firm.name} EA Rules`,
    label: "Prop Firm Guide",
    tagline: firm.tagline,
  });
}

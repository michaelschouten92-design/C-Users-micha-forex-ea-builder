import { COMPETITORS, getCompetitorBySlug } from "@/data/competitors";
import { renderClusterOG, OG_SIZE } from "@/lib/og/cluster-og";

// Statically pre-generated at build time (see generateStaticParams below).
export const alt = "Algo Studio alternative comparison";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): Array<{ slug: string }> {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export default async function AlternativeOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = getCompetitorBySlug(slug);
  if (!comp) {
    return renderClusterOG({
      title: "Alternative Comparison",
      label: "Algo Studio",
    });
  }
  return renderClusterOG({
    title: `Algo Studio vs ${comp.name}`,
    label: "Alternative",
    tagline: comp.tagline,
  });
}

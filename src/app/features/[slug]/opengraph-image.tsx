import { FEATURES, getFeatureBySlug } from "@/data/features";
import { renderClusterOG, OG_SIZE } from "@/lib/og/cluster-og";

export const runtime = "edge";
export const alt = "Algo Studio feature";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): Array<{ slug: string }> {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export default async function FeatureOGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);
  if (!feature) {
    return renderClusterOG({
      title: "Feature",
      label: "Algo Studio",
    });
  }
  return renderClusterOG({
    title: feature.name,
    label: "Feature",
    tagline: feature.tagline,
  });
}

import { EmbedWidget } from "./embed-widget";

interface EmbedPageProps {
  params: Promise<{ token: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { token } = await params;
  return <EmbedWidget token={token} />;
}

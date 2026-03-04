import { redirect } from "next/navigation";

export default async function ProofShortUrl({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/proof/${code}`);
}

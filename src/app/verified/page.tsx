import { permanentRedirect } from "next/navigation";

export default function VerifiedPage() {
  permanentRedirect("/strategies");
}

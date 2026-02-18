import { AnnouncementBanner } from "@/components/announcement-banner";
import { SuspendedGuard } from "@/components/suspended-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuspendedGuard />
      <AnnouncementBanner />
      {children}
    </>
  );
}

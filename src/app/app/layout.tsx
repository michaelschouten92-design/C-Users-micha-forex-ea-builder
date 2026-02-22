import { AnnouncementBanner } from "@/components/announcement-banner";
import { SuspendedGuard } from "@/components/suspended-guard";
import { ServiceWorkerRegistration } from "@/components/app/service-worker-registration";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuspendedGuard />
      <AnnouncementBanner />
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}

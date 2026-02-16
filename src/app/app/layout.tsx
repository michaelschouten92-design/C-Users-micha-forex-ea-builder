import { AnnouncementBanner } from "@/components/announcement-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBanner />
      {children}
    </>
  );
}

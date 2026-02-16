import { AnnouncementBanner } from "@/components/announcement-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <AnnouncementBanner />
      </div>
      {children}
    </>
  );
}

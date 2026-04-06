import Link from "next/link";

interface ChannelsOverviewProps {
  channels: {
    telegram: boolean;
    push: boolean;
  };
}

const CHANNEL_CONFIG: {
  key: keyof ChannelsOverviewProps["channels"];
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "push", label: "Browser Push", icon: "push", color: "#10B981" },
  { key: "telegram", label: "Telegram", icon: "telegram", color: "#29A9EB" },
];

function ChannelIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? "w-4 h-4";
  switch (type) {
    case "telegram":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.012-1.252-.242-1.865-.44-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case "push":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ChannelsOverview({ channels }: ChannelsOverviewProps) {
  const activeCount = Object.values(channels).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-white">Notification Channels</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#7C8DB0] font-medium">
            {activeCount}/2 active
          </span>
        </div>
        <Link
          href="/app/settings"
          className="text-[11px] text-[#818CF8] hover:text-white transition-colors"
        >
          Configure
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHANNEL_CONFIG.map((ch) => {
          const active = channels[ch.key];
          return (
            <div
              key={ch.key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                active
                  ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
                  : "border-[rgba(255,255,255,0.04)] bg-transparent opacity-40"
              }`}
            >
              <span style={{ color: active ? ch.color : "#7C8DB0" }}>
                <ChannelIcon type={ch.icon} className="w-3.5 h-3.5" />
              </span>
              <span className={`text-xs ${active ? "text-white" : "text-[#7C8DB0]"}`}>
                {ch.label}
              </span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] ml-auto flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

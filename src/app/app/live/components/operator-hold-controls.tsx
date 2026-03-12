"use client";

interface InstanceHoldInfo {
  id: string;
  eaName: string | null;
  symbol: string | null;
  operatorHold: string | null;
}

const MAX_VISIBLE = 6;

export function ManualHaltStatus({ instances }: { instances: InstanceHoldInfo[] }) {
  if (instances.length === 0) return null;

  const halted = instances.filter((i) => i.operatorHold !== "NONE");
  const visible = halted.slice(0, MAX_VISIBLE);
  const overflow = halted.length - visible.length;

  return (
    <div className="rounded-xl bg-[#1A0626] border border-[rgba(79,70,229,0.15)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium tracking-wider uppercase text-[#94A3B8]">Manual Halt</h3>
        <span className="text-[10px] font-mono text-[#64748B]">
          {halted.length} of {instances.length} halted
        </span>
      </div>

      {halted.length === 0 ? (
        <p className="text-xs text-[#64748B]">No strategies currently halted</p>
      ) : (
        <div className="space-y-2">
          {visible.map((inst) => {
            const label = inst.eaName || inst.symbol || inst.id.slice(0, 8);
            const isOverride = inst.operatorHold === "OVERRIDE_PENDING";
            return (
              <div key={inst.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#EF4444]" />
                <span className="text-sm text-[#CBD5E1] truncate">{label}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[#EF4444]">
                  {isOverride ? "Override pending" : "Halted"}
                </span>
              </div>
            );
          })}
          {overflow > 0 && <p className="text-[10px] text-[#64748B] font-mono">+{overflow} more</p>}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#64748B] leading-relaxed">
        Manual halt overrides all automated governance decisions.
      </p>
    </div>
  );
}

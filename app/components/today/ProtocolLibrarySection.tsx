import type { Protocol } from "../../types";

type ProtocolLibrarySectionProps = {
  collapsed: boolean;
  protocols: Protocol[];
  libraryProtocolId: string | null;
  onToggle: () => void;
  onSelectProtocol: (protocolId: string | null) => void;
};

export default function ProtocolLibrarySection({
  collapsed,
  protocols,
  libraryProtocolId,
  onToggle,
  onSelectProtocol,
}: ProtocolLibrarySectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={onToggle}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Protocol library
        </h2>
        <span className="text-sm text-zinc-500">{collapsed ? ">" : "v"}</span>
      </button>
      {!collapsed ? (
        <>
          <div className="mt-1 text-xs font-semibold tracking-wide text-zinc-400">
            Read-only
          </div>
          <div className="mt-4 space-y-3">
            {protocols.map((protocol) => {
              const isExpanded = protocol.id === libraryProtocolId;
              return (
                <div
                  key={protocol.id}
                  className={`rounded-xl border transition ${
                    isExpanded ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:border-zinc-400"
                    onClick={() => {
                      onSelectProtocol(isExpanded ? null : protocol.id);
                    }}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {protocol.name}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {protocol.commonBehaviourRemoved}
                      </div>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {isExpanded ? "v" : ">"}
                    </span>
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-zinc-200 bg-white/60 px-4 py-4">
                      <div className="border-l border-zinc-200 pl-4">
                        <dl className="space-y-4 text-sm text-zinc-700">
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                              Behaviour removed
                            </dt>
                            <dd className="mt-1">
                              {protocol.commonBehaviourRemoved}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                              Rule
                            </dt>
                            <dd className="mt-1">{protocol.rule}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                              Duration
                            </dt>
                            <dd className="mt-1">{protocol.duration}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-semibold tracking-wide text-zinc-500">
                              Failure condition
                            </dt>
                            <dd className="mt-1">{protocol.failure}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

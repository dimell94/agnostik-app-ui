import type {
  CorridorNeighborSnapshot,
  CorridorSnapshot,
  NeighborRef,
  Snapshot,
} from "../types/presence";

function toNeighborRef(snapshotNeighbor?: CorridorNeighborSnapshot | null): NeighborRef | null {
  if (!snapshotNeighbor) return null;
  return {
    userId: snapshotNeighbor.id,
    locked: snapshotNeighbor.locked,
    friend: snapshotNeighbor.friend,
    text: snapshotNeighbor.text ?? undefined,
    requestToMe: snapshotNeighbor.requestToMe,
    requestFromMe: snapshotNeighbor.requestFromMe,
  };
}

export function isCorridorSnapshot(payload: unknown): payload is CorridorSnapshot {
  if (!payload || typeof payload !== "object") return false;
  const maybe = payload as Record<string, unknown>;
  if (typeof maybe.me !== "object" || maybe.me === null) return false;
  if (typeof maybe.corridor !== "object" || maybe.corridor === null) return false;
  const me = maybe.me as Record<string, unknown>;
  const corridor = maybe.corridor as Record<string, unknown>;
  return typeof me.id === "number" && typeof me.myIndex === "number" && typeof corridor.size === "number";
}

export function convertCorridorSnapshot(payload: CorridorSnapshot): Snapshot {
  const left = toNeighborRef(payload.left ?? null);
  const right = toNeighborRef(payload.right ?? null);

  const outgoing: number[] = [];
  const incoming: number[] = [];

  if (payload.left) {
    if (payload.left.requestFromMe) outgoing.push(payload.left.id);
    if (payload.left.requestToMe) incoming.push(payload.left.id);
  }
  if (payload.right) {
    if (payload.right.requestFromMe) outgoing.push(payload.right.id);
    if (payload.right.requestToMe) incoming.push(payload.right.id);
  }

  return {
    type: "SNAPSHOT",
    data: {
      me: { id: payload.me.id, text: payload.me.text ?? null },
      myIndex: payload.me.myIndex,
      corridorSize: payload.corridor.size,
      neighbors: { left, right },
      locked: payload.me.locked,
      requests: {
        outgoing,
        incoming,
      },
    },
  };
}

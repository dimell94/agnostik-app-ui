// src/events/handlers.ts
import type {
  Snapshot,
  NeighborsUpdated,
  PresenceBroadcast,
  DirectPresenceEvent,
  UserLocked,
  UserUnlocked,
  FriendshipCreated,
  AutoLock,
} from "../types/presence";
import type { usePresence } from "../state/presenceStore";

function applyLockChange(
  event: UserLocked | UserUnlocked,
  actions: ReturnType<typeof usePresence>["actions"]
) {
  actions.setNeighborLock?.(event.data.userId, event.type === "USER_LOCKED");
}

function applyFriendship(
  event: FriendshipCreated | AutoLock,
  actions: ReturnType<typeof usePresence>["actions"]
) {
  const { userId1, userId2 } = event.data;
  actions.setNeighborFriend?.(userId1, true);
  actions.setNeighborFriend?.(userId2, true);
  if (event.type === "AUTO_LOCK") {
    actions.setNeighborLock?.(userId1, true);
    actions.setNeighborLock?.(userId2, true);
  }
}

export function createPresenceHandlers(actions: ReturnType<typeof usePresence>["actions"]) {
  return {
    handleSnapshot: (s: Snapshot) => {
      actions.applySnapshot(s);
    },
    handleNeighborsUpdated: (e: NeighborsUpdated) => {
      actions.applyNeighborsUpdated(e);
    },
    handleDirectEvent: (event: DirectPresenceEvent) => {
      switch (event.type) {
        case "SNAPSHOT":
          actions.applySnapshot(event);
          break;
        case "NEIGHBORS_UPDATED":
          actions.applyNeighborsUpdated(event);
          break;
        case "REQUEST_INCOMING":
          actions.addIncomingRequest?.(event.data.fromUserId);
          break;
        case "REQUEST_CANCELLED":
          actions.removeIncomingRequest?.(event.data.fromUserId);
          break;
        case "REQUEST_ACCEPTED":
          actions.removeOutgoingRequest?.(event.data.byUserId);
          actions.setNeighborFriend?.(event.data.byUserId, true);
          break;
        case "REQUEST_REJECTED":
          actions.removeOutgoingRequest?.(event.data.byUserId);
          break;
        case "NEIGHBOR_TEXT_UPDATED":
          actions.setNeighborText?.(event.data.userId, event.data.text);
          break;
        default:
          break;
      }
    },
    handleBroadcast: (event: PresenceBroadcast) => {
      switch (event.type) {
        case "USER_LOCKED":
        case "USER_UNLOCKED":
          applyLockChange(event, actions);
          break;
        case "FRIENDSHIP_CREATED":
        case "AUTO_LOCK":
          applyFriendship(event, actions);
          break;
        default:
          break;
      }
    },
  };
}

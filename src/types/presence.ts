// src/types/presence.ts
export type WsBroadcastType =
  | "USER_JOINED"
  | "USER_LEFT"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "USER_MOVED"
  | "FRIENDSHIP_CREATED"
  | "AUTO_LOCK";

export type DirectEventType =
  | "SNAPSHOT"
  | "NEIGHBORS_UPDATED"
  | "REQUEST_INCOMING"
  | "REQUEST_CANCELLED"
  | "REQUEST_ACCEPTED"
  | "REQUEST_REJECTED";

export type RequestPayload = {
  outgoing: number[];
  incoming: number[];
};

export type NeighborRef = {
  userId: number;
  locked: boolean;
  friend: boolean;
  text?: string;
  requestToMe?: boolean;
  requestFromMe?: boolean;
};

export type CorridorNeighborSnapshot = {
  id: number;
  text?: string | null;
  locked: boolean;
  friend: boolean;
  requestToMe: boolean;
  requestFromMe: boolean;
};

export type CorridorSnapshot = {
  me: {
    id: number;
    text?: string | null;
    locked: boolean;
    myIndex: number;
  };
  left?: CorridorNeighborSnapshot | null;
  right?: CorridorNeighborSnapshot | null;
  corridor: {
    size: number;
  };
};

export type Neighbors = {
  left?: NeighborRef | null;
  right?: NeighborRef | null;
};

// ----- Direct events
export type Snapshot = {
  type: "SNAPSHOT";
  data: {
    me?: { id: number; username?: string | null; text?: string | null };
    myIndex: number;
    corridorSize: number;
    neighbors: Neighbors;
    locked: boolean;
    friends?: number[];
    requests: RequestPayload;
  };
};

export type NeighborsUpdated = {
  type: "NEIGHBORS_UPDATED";
  data: {
    myIndex: number;
    corridorSize: number;
    left?: NeighborRef | null;
    right?: NeighborRef | null;
  };
};

export type RequestIncoming = {
  type: "REQUEST_INCOMING";
  data: { fromUserId: number };
};

export type RequestCancelled = {
  type: "REQUEST_CANCELLED";
  data: { fromUserId: number };
};

export type RequestAccepted = {
  type: "REQUEST_ACCEPTED";
  data: { byUserId: number };
};

export type RequestRejected = {
  type: "REQUEST_REJECTED";
  data: { byUserId: number };
};

export type NeighborTextUpdated = {
  type: "NEIGHBOR_TEXT_UPDATED";
  data: { userId: number; text: string };
};

export type DirectPresenceEvent =
  | Snapshot
  | NeighborsUpdated
  | RequestIncoming
  | RequestCancelled
  | RequestAccepted
  | RequestRejected
  | NeighborTextUpdated;

// ----- Broadcasts
export type UserMoved = {
  type: "USER_MOVED";
  data: { userId: number; fromIndex: number; toIndex: number; corridorSize: number };
};

export type MoveResult = UserMoved["data"];

export type UserLocked   = { type: "USER_LOCKED";   data: { userId: number } };
export type UserUnlocked = { type: "USER_UNLOCKED"; data: { userId: number } };
export type UserJoined   = { type: "USER_JOINED";   data: { userId: number; index: number; corridorSize: number } };
export type UserLeft     = { type: "USER_LEFT";     data: { userId: number; corridorSize: number } };
export type FriendshipCreated = { type: "FRIENDSHIP_CREATED"; data: { userId1: number; userId2: number } };
export type AutoLock          = { type: "AUTO_LOCK";          data: { userId1: number; userId2: number } };

export type PresenceBroadcast =
  | UserMoved
  | UserLocked
  | UserUnlocked
  | UserJoined
  | UserLeft
  | FriendshipCreated
  | AutoLock;

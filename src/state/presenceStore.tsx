// src/state/presenceStore.tsx
import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { Snapshot, NeighborsUpdated, Neighbors } from "../types/presence";

type PresenceState = {
  myId?: number | null;
  myName: string | null;
  myText: string;
  myIndex: number | null;
  corridorSize: number;
  lockedMe: boolean;
  neighbors: Neighbors; // { left?: {...} | null; right?: {...} | null }
  requests: { outgoing: number[]; incoming: number[] }; // userIds
  httpTextVersion: number;
};

type Actions = {
  setMyId: (id: number | null) => void;
  setMyName: (name: string | null) => void;
  applySnapshot: (s: Snapshot) => void;
  applySnapshotWithMeta: (payload: { snapshot: Snapshot; origin: "http" | "ws" }) => void;
  applyNeighborsUpdated: (e: NeighborsUpdated) => void;
  setLockedMe: (locked: boolean) => void;
  setNeighborLock: (userId: number, locked: boolean) => void;
  setNeighborFriend: (userId: number, friend: boolean) => void;
  setNeighborText: (userId: number, text: string) => void;

  // --- Requests / Friends (mock actions) ---
  addOutgoingRequest: (neighborId: number) => void;
  removeOutgoingRequest: (neighborId: number) => void;
  addIncomingRequest: (neighborId: number) => void;
  removeIncomingRequest: (neighborId: number) => void;

  reset: () => void;
};

const initialState: PresenceState = {
  myId: null,
  myName: "Mtsos2000",
  myText: "",
  myIndex: null,
  corridorSize: 0,
  lockedMe: false,
  neighbors: {},
  requests: { outgoing: [], incoming: [] },
  httpTextVersion: 0,
};

type Action =
  | { type: "SET_MY_ID"; id: number | null }
  | { type: "SET_MY_NAME"; name: string | null }
  | { type: "APPLY_SNAPSHOT"; payload: Snapshot }
  | { type: "APPLY_SNAPSHOT_META"; payload: { snapshot: Snapshot; origin: "http" | "ws" } }
  | { type: "APPLY_NEIGHBORS"; payload: NeighborsUpdated }
  | { type: "SET_LOCKED_ME"; locked: boolean }
  | { type: "SET_NEIGHBOR_LOCK"; userId: number; locked: boolean }
  | { type: "SET_NEIGHBOR_FRIEND"; userId: number; friend: boolean }
  | { type: "SET_NEIGHBOR_TEXT"; userId: number; text: string }
  | { type: "ADD_OUT_REQ"; id: number }
  | { type: "REMOVE_OUT_REQ"; id: number }
  | { type: "ADD_IN_REQ"; id: number }
  | { type: "REMOVE_IN_REQ"; id: number }
  | { type: "RESET" };

function uniqPush(arr: number[], id: number) {
  return arr.includes(id) ? arr : [...arr, id];
}
function removeId(arr: number[], id: number) {
  return arr.filter((x) => x !== id);
}

function reducer(state: PresenceState, action: Action): PresenceState {
  switch (action.type) {
    case "SET_MY_ID":
      return { ...state, myId: action.id };

    case "SET_MY_NAME":
      return { ...state, myName: action.name };

    case "APPLY_SNAPSHOT": {
      const { data } = action.payload;
      const me = data.me;
      const nextName = me && Object.prototype.hasOwnProperty.call(me, "username")
        ? me.username ?? null
        : state.myName;

      const baseRequests = data.requests ?? { outgoing: [], incoming: [] };
      const normalize = (arr?: number[]) => (Array.isArray(arr) ? [...arr] : []);
      let nextOutgoing = normalize(baseRequests.outgoing);
      let nextIncoming = normalize(baseRequests.incoming);

      const applyNeighborFlags = (neighbor?: Neighbors["left"]) => {
        if (!neighbor || neighbor.userId == null) return;
        if (neighbor.requestFromMe) {
          nextOutgoing = uniqPush(nextOutgoing, neighbor.userId);
        }
        if (neighbor.requestToMe) {
          nextIncoming = uniqPush(nextIncoming, neighbor.userId);
        }
      };

      applyNeighborFlags(data.neighbors.left ?? null);
      applyNeighborFlags(data.neighbors.right ?? null);

      return {
        ...state,
        myId: me?.id ?? state.myId ?? null,
        myName: nextName,
        myIndex: data.myIndex,
        corridorSize: data.corridorSize,
        neighbors: data.neighbors,
        lockedMe: data.locked,
        requests: {
          outgoing: nextOutgoing,
          incoming: nextIncoming,
        },
        httpTextVersion: state.httpTextVersion,
      };
    }

    case "APPLY_SNAPSHOT_META": {
      const { snapshot, origin } = action.payload;
      const base = reducer(state, { type: "APPLY_SNAPSHOT", payload: snapshot });
      if (origin === "http") {
        const textFromSnapshot = snapshot.data.me?.text;
        const nextText =
          typeof textFromSnapshot === "string" ? textFromSnapshot ?? "" : base.myText;
        return {
          ...base,
          myText: nextText,
          httpTextVersion: base.httpTextVersion + 1,
        };
      }
      return base;
    }

    case "APPLY_NEIGHBORS": {
      const { data } = action.payload;
      return {
        ...state,
        myIndex: data.myIndex,
        corridorSize: data.corridorSize,
        neighbors: {
          left: data.left ?? state.neighbors.left ?? null,
          right: data.right ?? state.neighbors.right ?? null,
        },
      };
    }

    case "SET_LOCKED_ME":
      return { ...state, lockedMe: action.locked };

    case "SET_NEIGHBOR_LOCK": {
      const left = state.neighbors.left;
      const right = state.neighbors.right;
      const isSelf = state.myId != null && state.myId === action.userId;
      return {
        ...state,
        lockedMe: isSelf ? action.locked : state.lockedMe,
        neighbors: {
          left: left && left.userId === action.userId ? { ...left, locked: action.locked } : left,
          right: right && right.userId === action.userId ? { ...right, locked: action.locked } : right,
        },
      };
    }

    case "SET_NEIGHBOR_FRIEND": {
      const left = state.neighbors.left;
      const right = state.neighbors.right;
      const isFriend = action.friend;
      const updateFriendFlag = (neighbor: Neighbors["left"]) =>
        neighbor && neighbor.userId === action.userId ? { ...neighbor, friend: isFriend } : neighbor;
      return {
        ...state,
        neighbors: {
          left: updateFriendFlag(left),
          right: updateFriendFlag(right),
        },
      };
    }

    case "SET_NEIGHBOR_TEXT": {
      const left = state.neighbors.left;
      const right = state.neighbors.right;
      const updateText = (neighbor: Neighbors["left"]) =>
        neighbor && neighbor.userId === action.userId ? { ...neighbor, text: action.text } : neighbor;
      return {
        ...state,
        neighbors: {
          left: updateText(left),
          right: updateText(right),
        },
      };
    }

    // --- Requests ---
    case "ADD_OUT_REQ":
      return {
        ...state,
        requests: {
          ...state.requests,
          outgoing: uniqPush(state.requests.outgoing, action.id),
        },
      };

    case "REMOVE_OUT_REQ":
      return {
        ...state,
        requests: {
          ...state.requests,
          outgoing: removeId(state.requests.outgoing, action.id),
        },
      };

    case "ADD_IN_REQ":
      return {
        ...state,
        requests: {
          ...state.requests,
          incoming: uniqPush(state.requests.incoming, action.id),
        },
      };

    case "REMOVE_IN_REQ":
      return {
        ...state,
        requests: {
          ...state.requests,
          incoming: removeId(state.requests.incoming, action.id),
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

const Ctx = createContext<{ state: PresenceState; actions: Actions } | null>(null);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions: Actions = useMemo(
    () => ({
      setMyId: (id) => dispatch({ type: "SET_MY_ID", id }),
      setMyName: (name) => dispatch({ type: "SET_MY_NAME", name }),
      applySnapshot: (s) => dispatch({ type: "APPLY_SNAPSHOT", payload: s }),
      applySnapshotWithMeta: ({ snapshot, origin }) =>
        dispatch({ type: "APPLY_SNAPSHOT_META", payload: { snapshot, origin } }),
      applyNeighborsUpdated: (e) => dispatch({ type: "APPLY_NEIGHBORS", payload: e }),
      setLockedMe: (locked) => dispatch({ type: "SET_LOCKED_ME", locked }),
      setNeighborLock: (userId, locked) =>
        dispatch({ type: "SET_NEIGHBOR_LOCK", userId, locked }),
      setNeighborFriend: (userId, friend) =>
        dispatch({ type: "SET_NEIGHBOR_FRIEND", userId, friend }),
      setNeighborText: (userId, text) =>
        dispatch({ type: "SET_NEIGHBOR_TEXT", userId, text }),

      addOutgoingRequest: (id) => dispatch({ type: "ADD_OUT_REQ", id }),
      removeOutgoingRequest: (id) => dispatch({ type: "REMOVE_OUT_REQ", id }),
      addIncomingRequest: (id) => dispatch({ type: "ADD_IN_REQ", id }),
      removeIncomingRequest: (id) => dispatch({ type: "REMOVE_IN_REQ", id }),

      reset: () => dispatch({ type: "RESET" }),
    }),
    []
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePresence() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}

// src/services/presenceController.ts

/**
 * Thin controller ανάμεσα σε UI και Backend.
 * - Καμία optimistic αλλαγή UI για friend requests.
 * - Το UI αλλάζει ΜΟΝΟ όταν έρθει επιβεβαίωση (backend ή Dev Panel) και
 *   τότε καλούνται τα κατάλληλα store actions ΕΚΤΟΣ controller.
 */

import type { Snapshot, MoveResult } from "../types/presence";
import { convertCorridorSnapshot, isCorridorSnapshot } from "../utils/snapshotAdapter";
import { sendTextUpdate } from "./presenceSocket";

function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const token = typeof window !== "undefined"
    ? window.localStorage.getItem("authToken")
    : null;

  const headers = new Headers(init?.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}

type PresenceActions = {
  // βασικά store actions (αν τα χρειαστείς)
  applySnapshot?: (s: Snapshot) => void;
  applySnapshotWithMeta?: (payload: { snapshot: Snapshot; origin: "http" | "ws" }) => void;
  applyNeighborsUpdated?: (e: any) => void;
  setMyId?: (id: number | null) => void;
  setMyName?: (name: string | null) => void;

  // προαιρετικά για requests — θα τα καλεί ΕΞΩ κάποιος όταν έρχεται event
  addOutgoingRequest?: (neighborId: number) => void;
  removeOutgoingRequest?: (neighborId: number) => void;
  addIncomingRequest?: (neighborId: number) => void;
  removeIncomingRequest?: (neighborId: number) => void;
  setNeighborText?: (userId: number, text: string) => void;
};

type Mode = "mock" | "live";

let actionsRef: PresenceActions | null = null;
let mode: Mode = "mock"; // μέχρι να κουμπώσει πραγματικό backend

type Direction = "left" | "right";

type MoveResponse =
  | { ok: true; result: MoveResult }
  | { ok: false; status: number };

const MOCK_SNAPSHOT: Snapshot = {
  type: "SNAPSHOT",
  data: {
    me: { id: 1, username: "Mtsos2000" },
    myIndex: 0,
    corridorSize: 1,
    neighbors: { left: null, right: null },
    locked: false,
    requests: { outgoing: [], incoming: [] },
  },
};

export const presenceController = {
  /**
   * Προαιρετικά: δώσε reference στα store actions (αν τα χρειαστείς αργότερα).
   * Δεν τα χρησιμοποιούμε για optimistic UI στα requests.
   */
  configure(actions: PresenceActions) {
    actionsRef = actions;
  },

  /** Ρύθμιση λειτουργίας: "mock" (logs) ή "live" (κάνει fetch στα REST). */
  setMode(next: Mode) {
    mode = next;
  },

  getMode() {
    return mode;
  },

  async fetchSnapshot(): Promise<void> {
    if (!actionsRef?.applySnapshot) {
      console.warn("[presenceController] fetchSnapshot called before configure");
      return;
    }

    const applyHttpSnapshot =
      actionsRef.applySnapshotWithMeta ??
      (({ snapshot }: { snapshot: Snapshot; origin: "http" | "ws" }) =>
        actionsRef?.applySnapshot?.(snapshot));

    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/snapshot");
        if (!res.ok) {
          console.warn("[presenceController] snapshot failed:", res.status);
          return;
        }
        const data = await res.json();

        if (data && typeof data === "object") {
          if ("data" in data) {
            applyHttpSnapshot({ snapshot: data as Snapshot, origin: "http" });
            return;
          }

          if (isCorridorSnapshot(data)) {
            applyHttpSnapshot({ snapshot: convertCorridorSnapshot(data), origin: "http" });
            return;
          }
        }

        console.warn("[presenceController] snapshot format not recognized", data);
      } catch (err) {
        console.error("[presenceController] snapshot error:", err);
      }
    } else {
      applyHttpSnapshot({ snapshot: MOCK_SNAPSHOT, origin: "http" });
    }
  },

  // ------------------------
  // Presence actions
  // ------------------------
  async moveLeft(): Promise<MoveResponse | undefined> {
    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/moveLeft", { method: "POST" });
        if (res.status === 409) {
          return { ok: false, status: 409 };
        }
        if (!res.ok) {
          console.warn("[presenceController] moveLeft failed:", res.status);
          return { ok: false, status: res.status };
        }
        const payload = (await res.json()) as MoveResult | { ok?: boolean; result?: MoveResult };
        if (payload && "result" in payload) {
          return payload.result
            ? { ok: true, result: payload.result }
            : { ok: false, status: 500 };
        }
        return { ok: true, result: payload as MoveResult };
      } catch (err) {
        console.error("[presenceController] moveLeft error:", err);
        return { ok: false, status: 500 };
      }
    } else {
      console.log("[mock] moveLeft()");
      return undefined;
    }
  },

  async moveRight(): Promise<MoveResponse | undefined> {
    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/moveRight", { method: "POST" });
        if (res.status === 409) {
          return { ok: false, status: 409 };
        }
        if (!res.ok) {
          console.warn("[presenceController] moveRight failed:", res.status);
          return { ok: false, status: res.status };
        }
        const payload = (await res.json()) as MoveResult | { ok?: boolean; result?: MoveResult };
        if (payload && "result" in payload) {
          return payload.result
            ? { ok: true, result: payload.result }
            : { ok: false, status: 500 };
        }
        return { ok: true, result: payload as MoveResult };
      } catch (err) {
        console.error("[presenceController] moveRight error:", err);
        return { ok: false, status: 500 };
      }
    } else {
      console.log("[mock] moveRight()");
      return undefined;
    }
  },

  async lock() {
    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/lock", { method: "POST" });
        if (!res.ok) console.warn("[presenceController] lock failed:", res.status);
      } catch (err) {
        console.error("[presenceController] lock error:", err);
      }
    } else {
      console.log("[mock] lock()");
    }
  },

  async unlock() {
    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/unlock", { method: "POST" });
        if (!res.ok) console.warn("[presenceController] unlock failed:", res.status);
      } catch (err) {
        console.error("[presenceController] unlock error:", err);
      }
    } else {
      console.log("[mock] unlock()");
    }
  },

  async leave() {
    if (mode === "live") {
      try {
        const res = await authFetch("/api/presence/leave", { method: "POST" });
        if (!res.ok) console.warn("[presenceController] leave failed:", res.status);
      } catch (err) {
        console.error("[presenceController] leave error:", err);
      }
    } else {
      console.log("[mock] leave()");
    }
  },

  // ------------------------
  // Friend Requests (ΧΩΡΙΣ optimistic UI)
  // ------------------------
  /**
   * Στέλνω friend request στον neighbor.
   * ΔΕΝ αλλάζουμε εδώ το UI (όχι addOutgoingRequest).
   * Το UI θα αλλάξει όταν έρθει επιβεβαίωση (event / Dev Panel).
   */
  async sendRequest(direction: Direction) {
    if (mode === "live") {
      try {
        const res = await authFetch(`/api/requests/send/${direction}`, { method: "POST" });
        if (!res.ok) {
          console.warn("[presenceController] sendRequest failed:", res.status);
          return;
        }
        // Επιτυχία: Περιμένουμε event για να ενημερωθεί το store (όχι εδώ).
      } catch (err) {
        console.error("[presenceController] sendRequest error:", err);
      }
    } else {
      console.log("[mock] sendRequest →", direction, "(UI δεν αλλάζει εδώ)");
    }
  },

  async updateText(text: string) {
    if (mode === "live") {
      sendTextUpdate(text);
    } else {
      console.log("[mock] updateText →", text);
    }
  },

  async cancelRequest(direction: Direction) {
    if (mode === "live") {
      try {
        const res = await authFetch(`/api/requests/cancel/${direction}`, { method: "POST" });
        if (!res.ok) {
          console.warn("[presenceController] cancelRequest failed:", res.status);
          return;
        }
        // Περιμένουμε event για να καθαριστεί το UI.
      } catch (err) {
        console.error("[presenceController] cancelRequest error:", err);
      }
    } else {
      console.log("[mock] cancelRequest →", direction, "(UI δεν αλλάζει εδώ)");
    }
  },

  async acceptRequest(direction: Direction) {
    if (mode === "live") {
      try {
        const res = await authFetch(`/api/requests/accept/${direction}`, { method: "POST" });
        if (!res.ok) {
          console.warn("[presenceController] acceptRequest failed:", res.status);
          return;
        }
        // Περιμένουμε REQUEST_ACCEPTED / FRIENDSHIP_CREATED / AUTO_LOCK events.
      } catch (err) {
        console.error("[presenceController] acceptRequest error:", err);
      }
    } else {
      console.log("[mock] acceptRequest →", direction);
    }
  },

  async rejectRequest(direction: Direction) {
    if (mode === "live") {
      try {
        const res = await authFetch(`/api/requests/reject/${direction}`, { method: "POST" });
        if (!res.ok) {
          console.warn("[presenceController] rejectRequest failed:", res.status);
          return;
        }
      } catch (err) {
        console.error("[presenceController] rejectRequest error:", err);
      }
    } else {
      console.log("[mock] rejectRequest →", direction);
    }
  },
};

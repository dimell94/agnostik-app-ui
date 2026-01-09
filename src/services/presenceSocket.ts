import { Client } from "@stomp/stompjs";
import type { StompSubscription } from "@stomp/stompjs";

if (typeof (window as any).global === "undefined") {
  (window as any).global = window;
}

import { createPresenceHandlers } from "../events/handlers";
import type { usePresence } from "../state/presenceStore";
import type { DirectPresenceEvent, PresenceBroadcast, Snapshot } from "../types/presence";
import { convertCorridorSnapshot, isCorridorSnapshot } from "../utils/snapshotAdapter";


type PresenceActions = ReturnType<typeof usePresence>["actions"];

let client: Client | null = null;
let subscription: StompSubscription | null = null;

const DIRECT_TYPES = new Set<DirectPresenceEvent["type"] | Snapshot["type"]>([
  "SNAPSHOT",
  "NEIGHBORS_UPDATED",
  "REQUEST_INCOMING",
  "REQUEST_CANCELLED",
  "REQUEST_ACCEPTED",
  "REQUEST_REJECTED",
  "NEIGHBOR_TEXT_UPDATED",
]);

const BROADCAST_TYPES = new Set<PresenceBroadcast["type"]>([
  "USER_LOCKED",
  "USER_UNLOCKED",
  "FRIENDSHIP_CREATED",
  "AUTO_LOCK",
]);

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("authToken");
}

function resolveBrokerUrl(): string | null {
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

function parseMessage(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch (err) {
    console.error("[presenceSocket] failed to parse message", err);
    return null;
  }
}

function handlePayload(payload: any, handlers: ReturnType<typeof createPresenceHandlers>) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (isCorridorSnapshot(payload)) {
    const snapshot = convertCorridorSnapshot(payload);
    handlers.handleSnapshot(snapshot);
    return;
  }

  if (typeof (payload as { type?: unknown }).type !== "string") {
    return;
  }

  const { type } = payload as { type: string };

  if (DIRECT_TYPES.has(type as any)) {
    if (type === "SNAPSHOT") {
      handlers.handleSnapshot(payload as Snapshot);
    } else {
      handlers.handleDirectEvent(payload as DirectPresenceEvent);
    }
    return;
  }

  if (BROADCAST_TYPES.has(type as any)) {
    handlers.handleBroadcast(payload as PresenceBroadcast);
  }
}

export function connectPresenceSocket(actions: PresenceActions) {
  if (client?.active) return client;

  const handlers = createPresenceHandlers(actions);

  const token = getToken();
  const brokerURL = resolveBrokerUrl();

  if (!brokerURL) {
    console.error("[presenceSocket] unable to resolve broker URL");
    return null;
  }

  client = new Client({
    brokerURL,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    debug: (msg) => {
      if (import.meta.env.DEV) {
        console.debug("[presenceSocket]", msg);
      }
    },
  });

  client.onConnect = () => {
    subscription = client?.subscribe("/user/queue/snapshot", (message) => {
      const payload = parseMessage(message.body);
      handlePayload(payload, handlers);
    }) ?? null;
  };

  client.onStompError = (frame) => {
    console.error("[presenceSocket] STOMP error", frame.headers["message"], frame.body);
  };

  client.activate();
  return client;
}

export function disconnectPresenceSocket() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }
  if (client) {
    const c = client;
    client = null;
    c.deactivate().catch((err) => {
      console.error("[presenceSocket] deactivate error", err);
    });
  }
}

export function sendTextUpdate(text: string) {
  if (client && client.active) {
    client.publish({
      destination: "/app/text",
      body: JSON.stringify({ text }),
    });
  } else {
    console.warn("[presenceSocket] Cannot send text, client not active");
  }
}

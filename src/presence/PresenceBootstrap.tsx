import { useEffect } from "react";
import { usePresence } from "../state/presenceStore";
import { presenceController } from "../services/presenceController";
import {
  connectPresenceSocket,
  disconnectPresenceSocket,
} from "../services/presenceSocket";

export default function PresenceBootstrap() {
  const { actions } = usePresence();

  useEffect(() => {
    presenceController.configure(actions);
    presenceController.setMode("live");
    presenceController.fetchSnapshot?.();
    connectPresenceSocket(actions);

    return () => {
      disconnectPresenceSocket();
      presenceController.setMode("mock");
    };
  }, [actions]);

  return null;
}

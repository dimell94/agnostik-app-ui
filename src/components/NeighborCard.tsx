import { AnimatePresence, motion, type AnimationControls } from "framer-motion";
import { BsHourglassSplit, BsPersonPlusFill } from "react-icons/bs";
import type { NeighborRef } from "../types/presence";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type NeighborCardProps = {
  side: "left" | "right";
  show: boolean;
  neighbor: NeighborRef | null;
  cardControls: AnimationControls;
  incomingControls: AnimationControls;
  showIncomingGhost: boolean;
  cardZ: number;
  highlightStyle?: CSSProperties;
  hasIncoming: boolean;
  showFriendable: boolean;
  showWait: boolean;
  onSendFriend?: () => void;
  onAcceptIncoming?: () => void;
  onRejectIncoming?: () => void;
  onCancelOutgoing?: () => void;
  gapPx?: number;
};

import "./NeighborCard.css";

export function NeighborCard({
  side,
  show,
  neighbor,
  cardControls,
  incomingControls,
  showIncomingGhost,
  cardZ,
  highlightStyle,
  hasIncoming,
  showFriendable,
  showWait,
  onSendFriend,
  onAcceptIncoming,
  onRejectIncoming,
  onCancelOutgoing,
  gapPx = 32,
}: NeighborCardProps) {
  const locked = neighbor?.locked ?? false;
  const displayText = (() => {
    const text = neighbor?.text;
    if (text && text.trim().length > 0) {
      return text;
    }
    return "";
  })();

  const acceptHoverClass =
    side === "left" ? "hover:bg-gray-500" : "hover:bg-gray-500";
  const actionButtonClass =
    "px-4 py-1.5 text-[14px] leading-none bg-gray-600 text-white font-semibold rounded-lg shadow-md cursor-pointer select-none transition-colors duration-150";
  const ghostInitialX = side === "left" ? `calc(-100% - ${gapPx}px)` : `calc(100% + ${gapPx}px)`;
  const ghostZ = side === "left" ? 15 : 25;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll) return;
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [displayText, autoScroll]);

  useEffect(() => {
    // when card mounts with content, ensure we start from bottom
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [show]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 4;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="relative h-full min-h-0">
      <AnimatePresence mode="wait">
        {show ? (
          <motion.div
            key={`${side}-${neighbor?.userId ?? "none"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative h-full"
          >
            <div
              className={`relative h-full transition-transform duration-300 ${
                locked ? "translate-y-4" : ""
              }`}
            >
              {hasIncoming && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 flex items-center gap-2 z-50">
                  <div
                    className={`${actionButtonClass} ${acceptHoverClass}`}
                    title="Accept"
                    onClick={onAcceptIncoming}
                  >
                    Accept
                  </div>
                  <div
                    className={`${actionButtonClass} ${acceptHoverClass}`}
                    title="Ignore"
                    onClick={onRejectIncoming}
                  >
                    Ignore
                  </div>
                </div>
              )}

              {!hasIncoming && (showFriendable || showWait) && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 z-40">
                  {showWait ? (
                    <div className="flex items-center gap-2">
                      <BsHourglassSplit
                        size={22}
                        className="text-gray-600 hourglass-pulse"
                        title="Request pending"
                      />
                      {onCancelOutgoing && (
                        <div
                          className={`${actionButtonClass} ${acceptHoverClass}`}
                          role="button"
                          tabIndex={0}
                          onClick={onCancelOutgoing}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              onCancelOutgoing();
                            }
                          }}
                        >
                          Cancel
                        </div>
                      )}
                    </div>
                  ) : (
                    <BsPersonPlusFill
                      size={24}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="Add Friend"
                      onClick={onSendFriend}
                    />
                  )}
                </div>
              )}

              <motion.div
                initial={{ x: "0%", opacity: 1 }}
                animate={cardControls}
                ref={scrollRef}
                onScroll={handleScroll}
                className="relative h-full min-h-0 overflow-y-auto overflow-x-hidden rounded-lg bg-gray-50 p-6 shadow-md transform-gpu"
                style={{ zIndex: cardZ, backgroundColor: "#fdfdfd", ...(highlightStyle ?? {}) }}
              >
                <p className="text-gray-600 whitespace-pre-wrap break-words">{displayText}</p>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showIncomingGhost && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ zIndex: ghostZ }}
        >
          <motion.div
            initial={{ x: ghostInitialX, opacity: 0 }}
            animate={incomingControls}
            className="absolute inset-0 rounded-lg bg-gray-50 p-6 shadow-md transform-gpu"
          >
            <div className="mb-2 text-sm font-semibold text-gray-500">…</div>
            <p className="text-gray-600">…</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

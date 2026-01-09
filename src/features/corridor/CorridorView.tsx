import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BsArrowLeftSquareFill, BsArrowRightSquareFill } from "react-icons/bs";
import { FaLock, FaLockOpen } from "react-icons/fa6";
import { motion, useAnimation } from "framer-motion";
import { usePresence } from "../../state/presenceStore";
import { presenceController } from "../../services/presenceController";
import { NeighborCard } from "../../components/NeighborCard";
import type { NeighborRef } from "../../types/presence";

import rightArr from "../../assets/right.png";
import leftArr from "../../assets/left.png";

export function CorridorView() {
  const { state, actions } = usePresence();
  const myIndex = state.myIndex ?? 0;
  const corridorSize = state.corridorSize;
  const lockedStore = state.lockedMe;
  const leftNeighbor = state.neighbors.left ?? null;
  const rightNeighbor = state.neighbors.right ?? null;
  const isFriendLeft = !!leftNeighbor?.friend;
  const isFriendRight = !!rightNeighbor?.friend;
  const friendGlow: CSSProperties = {
    boxShadow: "0 0 25px 8px rgba(245,158,11,0.35)",
  };

  const out = state.requests?.outgoing ?? [];
  const inc = state.requests?.incoming ?? [];
  const leftId = leftNeighbor?.userId;
  const rightId = rightNeighbor?.userId;
  const hasOutgoingLeft = !!(leftId && out.includes(leftId));
  const hasOutgoingRight = !!(rightId && out.includes(rightId));
  const hasIncomingLeft = !!(leftId && inc.includes(leftId));
  const hasIncomingRight = !!(rightId && inc.includes(rightId));

  const lockedUi = !!lockedStore;

  const handleLock = useCallback(() => {
    if (!lockedUi) {
      presenceController.lock?.();
    }
  }, [lockedUi]);

  const handleUnlock = useCallback(() => {
    if (lockedUi) {
      presenceController.unlock?.();
    }
  }, [lockedUi]);

  const canGoLeft = myIndex > 0 && !!leftNeighbor;
  const canGoRight = myIndex < corridorSize - 1 && !!rightNeighbor;

  const [centerText, setCenterText] = useState<string>("");
  const [lastSentText, setLastSentText] = useState<string>("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const leftCtrl = useAnimation();
  const centerCtrl = useAnimation();
  const rightCtrl = useAnimation();

  const incomingRightCtrl = useAnimation();
  const incomingLeftCtrl = useAnimation();
  const [showIncomingRight, setShowIncomingRight] = useState(false);
  const [showIncomingLeft, setShowIncomingLeft] = useState(false);

  const [pendingMove, setPendingMove] = useState<"left" | "right" | null>(null);
  useEffect(() => {
    presenceController.configure(actions);
  }, [actions]);

  useEffect(() => {
    if (state.httpTextVersion > 0) {
      const next = typeof state.myText === "string" ? state.myText : "";
      setCenterText(next);
      setLastSentText(next);
      setHasHydrated(true);
    }
  }, [state.httpTextVersion, state.myText]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (centerText === lastSentText) {
      return;
    }
    presenceController.updateText?.(centerText);
    setLastSentText(centerText);
  }, [centerText, hasHydrated, lastSentText]);

  const handleMoveRight = useCallback(async () => {
    if (!canGoRight || lockedUi || pendingMove) return;
    setPendingMove("right");
    try {
      const response = await presenceController.moveRight?.();
      if (response && !response.ok && response.status === 409) {
        console.info("[presence] moveRight blocked (409)");
      }
    } finally {
      setPendingMove(null);
    }
  }, [canGoRight, lockedUi, pendingMove]);

  const handleMoveLeft = useCallback(async () => {
    if (!canGoLeft || lockedUi || pendingMove) return;
    setPendingMove("left");
    try {
      const response = await presenceController.moveLeft?.();
      if (response && !response.ok && response.status === 409) {
        console.info("[presence] moveLeft blocked (409)");
      }
    } finally {
      setPendingMove(null);
    }
  }, [canGoLeft, lockedUi, pendingMove]);

  const effectiveLeftNeighbor: NeighborRef | null = leftNeighbor;
  const effectiveRightNeighbor: NeighborRef | null = rightNeighbor;

  const highlightCenter = isFriendLeft || isFriendRight;
  const leftCardZ = 10;
  const rightCardZ = 20;
  const centerCardZ = 30;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTyping =
        !!active &&
        (active.tagName === "TEXTAREA" ||
          active.tagName === "INPUT" ||
          active.isContentEditable);
      if (e.key === "Escape") {
        e.preventDefault();
        if (active === textAreaRef.current) {
          textAreaRef.current?.blur();
        } else {
          textAreaRef.current?.focus();
        }
        return;
      }
      if (isTyping) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        handleLock();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleUnlock();
        return;
      }
      if (lockedUi || pendingMove) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        void handleMoveRight();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handleMoveLeft();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockedUi, handleMoveLeft, handleMoveRight, pendingMove, handleLock, handleUnlock]);

  const showLeftCard = !!effectiveLeftNeighbor;
  const showRightCard = !!effectiveRightNeighbor;

  const showFriendableLeft =
    !!leftNeighbor && lockedUi && leftNeighbor.locked && !leftNeighbor.friend && !hasOutgoingLeft;
  const showFriendableRight =
    !!rightNeighbor && lockedUi && rightNeighbor.locked && !rightNeighbor.friend && !hasOutgoingRight;
  const showWaitLeft = !!leftNeighbor && hasOutgoingLeft;
  const showWaitRight = !!rightNeighbor && hasOutgoingRight;

  const sendFriendReq = (direction: "left" | "right") => {
    presenceController.sendRequest?.(direction);
  };

  const leftHasId = leftId !== undefined && leftId !== null;
  const rightHasId = rightId !== undefined && rightId !== null;

  const onAcceptLeft = leftHasId
    ? () => {
      presenceController.acceptRequest?.("left");
    }
    : undefined;
  const onRejectLeft = leftHasId
    ? () => {
      presenceController.rejectRequest?.("left");
    }
    : undefined;
  const onSendFriendLeft = leftHasId
    ? () => {
      sendFriendReq("left");
    }
    : undefined;
  const onCancelLeft = leftHasId
    ? () => {
      presenceController.cancelRequest?.("left");
    }
    : undefined;

  const onAcceptRight = rightHasId
    ? () => {
      presenceController.acceptRequest?.("right");
    }
    : undefined;
  const onRejectRight = rightHasId
    ? () => {
      presenceController.rejectRequest?.("right");
    }
    : undefined;
  const onSendFriendRight = rightHasId
    ? () => {
      sendFriendReq("right");
    }
    : undefined;
  const onCancelRight = rightHasId
    ? () => {
      presenceController.cancelRequest?.("right");
    }
    : undefined;

  return (
    <>
      <div className="w-full px-6 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-4 w-full">
          <div className="w-10 flex justify-center">
            <BsArrowLeftSquareFill
              onClick={
                canGoLeft && !lockedUi
                  ? () => void handleMoveLeft()
                  : undefined
              }
              className={`text-3xl leading-none ${canGoLeft && !lockedUi && !pendingMove
                ? "cursor-pointer text-gray-500 hover:text-gray-700"
                : "text-gray-300 cursor-not-allowed"
                }`}
              title="Move left"
              aria-label="Move left"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="h-[70vh] w-full">
              <div className="grid h-full w-full grid-cols-3 gap-8 relative" style={{ perspective: 1200 }}>
                <NeighborCard
                  side="left"
                  show={showLeftCard}
                  neighbor={effectiveLeftNeighbor ?? null}
                  cardControls={leftCtrl}
                  incomingControls={incomingLeftCtrl}
                  showIncomingGhost={showIncomingLeft}
                  cardZ={leftCardZ}
                  highlightStyle={isFriendLeft ? friendGlow : undefined}
                  hasIncoming={hasIncomingLeft}
                  showFriendable={showFriendableLeft}
                  showWait={showWaitLeft}
                  onSendFriend={onSendFriendLeft}
                  onAcceptIncoming={onAcceptLeft}
                  onRejectIncoming={onRejectLeft}
                  onCancelOutgoing={onCancelLeft}
                />

                <div className="relative min-h-0">
                  {hasIncomingLeft && (
                    <motion.img
                      src={rightArr}
                      alt="Incoming from left"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="pointer-events-none absolute top-1/2 -translate-y-0.1 left-[-1.9rem] w-[30px] h-[30px] object-contain z-[35]"
                    />
                  )}
                  {hasIncomingRight && (
                    <motion.img
                      src={leftArr}
                      alt="Incoming from right"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="pointer-events-none absolute top-1/2 -translate-y-0.1 right-[-1.9rem] w-[30px] h-[30px] object-contain z-[35]"
                    />
                  )}


                  <motion.div
                    initial={{ x: 0 }}
                    animate={centerCtrl}
                    className={`relative h-full min-h-0 rounded-lg bg-white p-6 pr-0 shadow-md transition-transform duration-300 ${lockedUi ? "translate-y-4" : ""
                      } overflow-hidden transform-gpu`}
                    style={{
                      zIndex: centerCardZ,
                      ...(highlightCenter ? friendGlow : {}),
                    }}
                  >
                    <textarea
                      ref={textAreaRef}
                      value={centerText}
                      onChange={(e) => setCenterText(e.target.value)}
                      placeholder="Write anything ..."
                      aria-label="Κείμενο μεσαίας κάρτας"
                      className="h-full w-full min-h-0 resize-none border-0 outline-none focus:ring-0 text-gray-700 placeholder:text-gray-400 overflow-y-auto pr-6"
                      spellCheck={false}
                      maxLength={6000}
                    />
                  </motion.div>
                </div>

                <NeighborCard
                  side="right"
                  show={showRightCard}
                  neighbor={effectiveRightNeighbor ?? null}
                  cardControls={rightCtrl}
                  incomingControls={incomingRightCtrl}
                  showIncomingGhost={showIncomingRight}
                  cardZ={rightCardZ}
                  highlightStyle={isFriendRight ? friendGlow : undefined}
                  hasIncoming={hasIncomingRight}
                  showFriendable={showFriendableRight}
                  showWait={showWaitRight}
                  onSendFriend={onSendFriendRight}
                  onAcceptIncoming={onAcceptRight}
                  onRejectIncoming={onRejectRight}
                  onCancelOutgoing={onCancelRight}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-8 text-2xl">
              <div className={`transition-transform duration-300 ${leftNeighbor?.locked ? "translate-y-4" : ""}`}>
                <motion.div initial={{ x: "0%", opacity: 1 }} animate={leftCtrl} className="flex justify-center">
                  {showLeftCard &&
                    (leftNeighbor?.locked ? (
                      <FaLock className="text-gray-600" aria-hidden="true" />
                    ) : (
                      <FaLockOpen className="text-gray-300" aria-hidden="true" />
                    ))}
                </motion.div>
              </div>

              <motion.div
                initial={{ x: "0%", opacity: 1 }}
                animate={centerCtrl}
                className={`flex justify-center transition-transform duration-300 ${lockedUi ? "translate-y-4" : ""
                  } pointer-events-auto`}
              >
                {lockedUi ? (
                  <FaLock
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer text-gray-600 hover:text-gray-800"
                    title="Click to unlock"
                    aria-label="Click to unlock"
                    onClick={handleUnlock}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleUnlock()}
                  />
                ) : (
                  <FaLockOpen
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer text-gray-600 hover:text-gray-800"
                    title="Click to lock"
                    aria-label="Click to lock"
                    onClick={handleLock}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleLock()}
                  />
                )}
              </motion.div>

              <div className={`transition-transform duration-300 ${rightNeighbor?.locked ? "translate-y-4" : ""}`}>
                <motion.div initial={{ x: "0%", opacity: 1 }} animate={rightCtrl} className="flex justify-center">
                  {showRightCard &&
                    (rightNeighbor?.locked ? (
                      <FaLock className="text-gray-600" aria-hidden="true" />
                    ) : (
                      <FaLockOpen className="text-gray-300" aria-hidden="true" />
                    ))}
                </motion.div>
              </div>
            </div>
          </div>
          <div className="w-10 flex justify-center">
            <BsArrowRightSquareFill
              onClick={
                canGoRight && !lockedUi
                  ? () => void handleMoveRight()
                  : undefined
              }
              className={`text-3xl leading-none ${canGoRight && !lockedUi && !pendingMove
                ? "cursor-pointer text-gray-500 hover:text-gray-700"
                : "text-gray-300 cursor-not-allowed"
                }`}
              title="Move right"
              aria-label="Move right"
            />
          </div>
        </div>
      </div>
    </>
  );
}

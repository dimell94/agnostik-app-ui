import { useEffect, useRef, useState } from "react";

type HeaderProps = {
  username?: string | null;
  onLogout?: () => void;
  showUserMenu?: boolean;
};

export function Header({ username, onLogout, showUserMenu = true }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        menuRef.current &&
        !buttonRef.current.contains(target) &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const displayName = username?.trim() || "User";

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-2">
        <h1 className="text-3xl font-bold text-gray-800">agnostik</h1>

        {showUserMenu ? (
          <div className="relative">
            <div
              ref={buttonRef}
              onClick={() => setMenuOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setMenuOpen((open) => !open);
                }
              }}
              className="text-sm text-gray-700 border border-gray-200 rounded px-3 py-1 cursor-pointer transition-colors focus:outline-none focus-visible:ring-0 hover:bg-gray-200"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              role="button"
              tabIndex={0}
            >
              {displayName}
            </div>
            <div
              ref={menuRef}
              className={`absolute right-0 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg ${
                menuOpen ? "" : "hidden"
              }`}
              role="menu"
              aria-hidden={!menuOpen}
            >
              <button
                type="button"
                onClick={onLogout}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

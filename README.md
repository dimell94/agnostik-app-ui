# Agnostik Frontend

- Real-time, corridor-style social network where users text live with their immediate neighbors.
- After register/login, each user enters a shared corridor; the text area sits center stage and can be focused/unfocused via click or Esc.
- Typed text streams instantly to adjacent neighbors—no submit button—so nearby users see updates as you type.
- Navigation via arrow icons or keyboard arrows lets users roam the corridor to meet and interact.
- Users can lock their current slot (lock icon or down arrow); locked users can’t be displaced and can’t move until they unlock (unlock icon or up arrow).
- When two adjacent users are both locked, no one can slip between them and an “add friend” icon appears for friend requests.
- Friends who meet get a yellow outline indicator and auto-lock until each unlocks.

Backend README: https://github.com/dimell94/agnostik-app/blob/main/README.md

## Requirements
- Node.js 20+, npm

## Quick start
1) Ensure backend is running (per backend README).
2) Frontend:
   ```bash
   npm install
   npm run dev
   ```
   - Build: `npm run build` → `dist/`
   - Preview: `npm run preview`
   - Lint: `npm run lint`

## Configuration
- Dev proxy in `vite.config.ts` forwards `/api` and `/ws` to `http://localhost:8080`; adjust `target` if backend host/port differ.
- Auth token stored in `localStorage` as `authToken` and sent as Bearer to REST/STOMP.

## WebSocket
- STOMP connects to `/ws`, subscribes to `/user/queue/snapshot`, and publishes text updates to `/app/text`.

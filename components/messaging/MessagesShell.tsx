"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import InboxClient from "./InboxClient"
import { C } from "./ui"

// Desktop: the inbox on the left and the open conversation on the right.
// Phones and narrow windows (≤ 900px): the inbox alone at /messages, and the
// conversation full width at /messages/[id], with a back button. The site
// header (and its search) stays visible on every size.
const SHELL_CSS = `
.msg-shell {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  height: calc(100dvh - 53px - 52px);
  min-height: 480px;
  border: 1px solid ${C.line};
  border-radius: 18px;
  overflow: hidden;
  background: ${C.base};
  font-family: ${C.font};
}
.msg-inbox { border-right: 1px solid ${C.line}; min-height: 0; display: flex; flex-direction: column; background: ${C.base}; }
.msg-pane { min-width: 0; min-height: 0; display: flex; flex-direction: column; position: relative; background: ${C.base}; }
.msg-only-narrow { display: none !important; }
.msg-row .msg-report { opacity: 0; transition: opacity 120ms ease; }
.msg-row:hover .msg-report, .msg-row:focus-within .msg-report { opacity: 1; }
@media (hover: none) { .msg-row .msg-report { opacity: 1; } }
@media (max-width: 900px) {
  .msg-shell { grid-template-columns: minmax(0, 1fr); }
  .msg-shell[data-mode="thread"] .msg-inbox { display: none; }
  .msg-shell[data-mode="inbox"] .msg-pane { display: none; }
  .msg-shell[data-mode="inbox"] .msg-inbox { border-right: 0; }
  .msg-only-narrow { display: inline-flex !important; }
}
@media (max-width: 760px) {
  .msg-shell {
    height: calc(100dvh - 53px - 16px - 80px - env(safe-area-inset-bottom, 0px));
    min-height: 0;
    border-radius: 14px;
  }
}
`

export default function MessagesShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/messages"
  const match = pathname.match(/^\/messages\/([^/]+)/)
  const activeId = match ? decodeURIComponent(match[1]) : null
  return (
    <div className="msg-shell" data-mode={activeId ? "thread" : "inbox"}>
      <style>{SHELL_CSS}</style>
      <aside className="msg-inbox" aria-label="Conversations">
        <InboxClient activeId={activeId} />
      </aside>
      <section className="msg-pane">{children}</section>
    </div>
  )
}

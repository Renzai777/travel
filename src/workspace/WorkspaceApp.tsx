import { useEffect, useState, type MouseEvent } from "react";
import { appNavigate } from "../routing/location";
import { getMember, type Member } from "./device";
import { MemberChip } from "./MemberChip";
import { NewWorkspace } from "./NewWorkspace";
import { WorkspacePage } from "./WorkspacePage";
import { WorkspacesHome } from "./WorkspacesHome";
import { parseWsPath } from "./wsRoutes";
import "./workspace.css";

export default function WorkspaceApp({ pathname }: { pathname: string }) {
  const route = parseWsPath(pathname);
  const [member, setMember] = useState<Member | null>(() => getMember());

  useEffect(() => {
    const sync = () => setMember(getMember());
    window.addEventListener("ws:memberchange", sync);
    return () => window.removeEventListener("ws:memberchange", sync);
  }, []);

  useEffect(() => {
    if (route.kind === "redirect") {
      appNavigate(route.to, { replace: true });
    }
  }, [route]);

  if (route.kind === "redirect") {
    return null;
  }

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate(to);
  };

  return (
    <div className="ws-app">
      <header className="ws-header">
        <a className="ws-back-link" href="/" onClick={(e) => handleNavClick(e, "/")}>
          ← Guide
        </a>
        <a className="ws-wordmark" href="/w" onClick={(e) => handleNavClick(e, "/w")}>
          Trip workspace
        </a>
        <div className="ws-header-right">{member && <MemberChip />}</div>
      </header>

      <main id="main" className="ws-main">
        {route.kind === "new" ? (
          <NewWorkspace />
        ) : route.kind === "home" ? (
          <WorkspacesHome />
        ) : (
          <WorkspacePage key={route.wsId} wsId={route.wsId} />
        )}
      </main>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { appNavigate } from "../routing/location";
import { setActiveDoc } from "./activeDoc";
import { deviceKeyFor, getMember, upsertDeviceWorkspace, type Member } from "./device";
import { wsDocName } from "./docNames";
import { FolderSidebar } from "./FolderSidebar";
import { FolderView } from "./FolderView";
import { MemberDialog } from "./MemberDialog";
import { openDoc, type OpenDoc } from "./openDoc";
import { getTitle, listMembers, setTitle, upsertMember, wsMaps } from "./schema";
import { ShareDialog } from "./ShareDialog";
import { buildFolderTree } from "./tree";
import { folderPath, keyFromHash } from "./wsRoutes";

export interface WorkspacePageProps {
  wsId: string;
  folderId: string | null;
}

export function WorkspacePage({ wsId, folderId }: WorkspacePageProps) {
  // Read only here (render must stay pure); the effect below saves the key and strips it from the address bar.
  // This page remounts per workspace (keyed by wsId), so the initial value is final.
  const [key] = useState<string | null>(() => keyFromHash(window.location.hash) ?? deviceKeyFor(wsId));

  useEffect(() => {
    const k = keyFromHash(window.location.hash);
    if (!k) return;
    upsertDeviceWorkspace({ id: wsId, key: k });
    history.replaceState(null, "", window.location.pathname + window.location.search); // the key never stays in the address bar
  }, [wsId]);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [handle, setHandle] = useState<OpenDoc | null>(null);
  const [version, setVersion] = useState(0);
  const [member, setMember] = useState<Member | null>(() => getMember());

  useEffect(() => {
    const sync = () => setMember(getMember());
    window.addEventListener("ws:memberchange", sync);
    return () => window.removeEventListener("ws:memberchange", sync);
  }, []);

  useEffect(() => {
    if (!key) return;
    let mounted = true;
    const h = openDoc(wsDocName(wsId));

    // State is only set from the async callbacks (never synchronously in the effect).
    h.synced.then(
      () => {
        if (mounted) {
          setHandle(h);
          setStatus("ready");
          setActiveDoc(h.doc);
        }
      },
      () => {
        if (mounted) {
          setStatus("error");
          setActiveDoc(null);
        }
      },
    );

    return () => {
      mounted = false;
      setActiveDoc(null);
      h.destroy();
    };
  }, [wsId, key]);

  useEffect(() => {
    if (status !== "ready" || !handle) return;
    const doc = handle.doc;
    const { meta, members, nodes } = wsMaps(doc);

    const onDeepChange = () => {
      setVersion((v) => v + 1);
    };

    meta.observeDeep(onDeepChange);
    members.observeDeep(onDeepChange);
    nodes.observeDeep(onDeepChange);

    return () => {
      meta.unobserveDeep(onDeepChange);
      members.unobserveDeep(onDeepChange);
      nodes.unobserveDeep(onDeepChange);
    };
  }, [status, handle]);

  const tree = useMemo(() => {
    if (status !== "ready" || !handle) return null;
    return buildFolderTree(handle.doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, handle, version]);

  const docTitle = handle && status === "ready" ? getTitle(handle.doc) : "Untitled trip";

  useEffect(() => {
    if (status !== "ready" || !handle || !tree) return;
    if (folderId && tree.byId.has(folderId)) {
      const folderTitle = tree.byId.get(folderId)?.title ?? "Folder";
      document.title = `${folderTitle} · ${docTitle}`;
    } else {
      document.title = `${docTitle} · Trip workspace`;
    }
    upsertDeviceWorkspace({ id: wsId, title: docTitle, lastOpened: Date.now() });
  }, [status, handle, docTitle, wsId, folderId, tree]);

  useEffect(() => {
    if (status === "ready" && handle && member) {
      upsertMember(handle.doc, member);
    }
  }, [status, handle, member]);

  // While editing, the input shows a local draft; otherwise it shows the shared title (which may change from another tab).
  const [draft, setDraft] = useState<string | null>(null);
  const cancelNextBlur = useRef(false); // Escape → blur must not commit the draft (state updates aren't applied yet)
  const inputTitle = draft ?? docTitle;

  const commitTitle = () => {
    if (cancelNextBlur.current) {
      cancelNextBlur.current = false;
      setDraft(null);
      return;
    }
    if (handle && draft !== null) {
      const clean = draft.trim();
      if (clean && clean !== docTitle) setTitle(handle.doc, clean);
    }
    setDraft(null);
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitTitle();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      cancelNextBlur.current = true;
      setDraft(null);
      e.currentTarget.blur();
    }
  };

  const navigateBack = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    appNavigate("/w");
  };

  if (!key) {
    return (
      <div className="ws-panel ws-no-key">
        <h2>Workspace access key needed</h2>
        <p>
          You need the full share link to open this workspace. Ask the person who shared it to send the complete link.
        </p>
        <p>
          <a href="/w" onClick={navigateBack}>
            Back to your workspaces
          </a>
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <p className="ws-loading" role="status">
        Opening the workspace…
      </p>
    );
  }

  if (status === "error" || !handle || !tree) {
    return (
      <div className="ws-panel ws-error" role="alert">
        <p>
          This browser couldn't open its local storage (private mode or storage blocked?). Nothing was lost on other
          devices.
        </p>
        <p>
          <a href="/w" onClick={navigateBack}>
            Back to your workspaces
          </a>
        </p>
      </div>
    );
  }

  const members = listMembers(handle.doc);
  const isFolderMissing = Boolean(folderId && !tree.byId.has(folderId));

  return (
    <div className="ws-page">
      {!member && (
        <MemberDialog
          isOpen={true}
          isDismissable={false}
          onSaved={(m) => {
            setMember(m);
            upsertMember(handle.doc, m);
          }}
        />
      )}

      <div className="ws-page-header">
        <div className="ws-title-wrapper">
          <input
            id="ws-title-input"
            className="ws-title-input"
            value={inputTitle}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            aria-label="Workspace name"
          />
        </div>
        <ShareDialog wsId={wsId} wsKey={key} />
      </div>

      <div className="ws-grid">
        <aside className="ws-panel ws-aside">
          <FolderSidebar doc={handle.doc} wsId={wsId} tree={tree} currentFolderId={folderId} member={member} />
          <div className="ws-aside-section">
            <h3 className="ws-section-title">People</h3>
            <ul className="ws-people-list">
              {members.map((m) => (
                <li key={m.id} className="ws-person-item">
                  <span className="ws-dot" style={{ backgroundColor: m.color }} aria-hidden="true" />
                  <span className="ws-person-name">{m.name}</span>
                  {member && m.id === member.id && <span className="ws-you"> (you)</span>}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="ws-panel ws-library">
          {isFolderMissing ? (
            <div className="ws-empty">
              <p>This folder doesn't exist (any more).</p>
              <p>
                <a
                  href={folderPath(wsId, null)}
                  onClick={(e) => {
                    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                      return;
                    e.preventDefault();
                    appNavigate(folderPath(wsId, null));
                  }}
                >
                  Go to the workspace root
                </a>
              </p>
            </div>
          ) : (
            <FolderView wsId={wsId} tree={tree} folderId={folderId} />
          )}
        </section>
      </div>
    </div>
  );
}

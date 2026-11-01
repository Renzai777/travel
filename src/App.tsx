// App shell: the guide (/, sections) or the lazily loaded trip workspace (/w…). Clean URLs via the History API (src/routing/).
import { lazy, Suspense } from "react";
import { GuideApp } from "./guide/GuideApp";
import { UpdateToast } from "./pwa/UpdateToast";
import { isWorkspacePath, usePathname } from "./routing/location";

const WorkspaceApp = lazy(() => import("./workspace/WorkspaceApp"));

export default function App() {
  const pathname = usePathname();
  return (
    <>
      {isWorkspacePath(pathname) ? (
        <Suspense
          fallback={
            <p className="ws-loading" role="status">
              Loading the trip workspace…
            </p>
          }
        >
          <WorkspaceApp pathname={pathname} />
        </Suspense>
      ) : (
        <GuideApp />
      )}
      <UpdateToast />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import * as constants from "../constants";
import { log } from "../log";
import LogPane from "./LogPane";

export function ShellApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // useEffect(() => {
  //   const fn = (event: MessageEvent) => {
  //     //
  //   };
  //   window.addEventListener("message", fn);
  //   return () => window.removeEventListener("message", fn);
  // }, []);

  useEffect(() => {
    const iframe = iframeRef.current!;
    const levelUrl = window.location.origin;
    const src = new URL(constants.gameUrl);
    src.searchParams.set("levelBaseUrl", levelUrl);
    log.info(`Loading game from ${constants.gameUrl}`);
    iframe.src = src.toString();
  }, [reloadCount]);

  useEffect(() => {
    if (import.meta.hot) {
      const fn = () => {
        log.info("Reloading level", { dev: true, color: "green" });
        setReloadCount((count) => count + 1);
      };
      import.meta.hot.on("gl:level-reload", fn);

      return () => {
        import.meta.hot!.off("gl:level-reload", fn);
      };
    }
  }, []);

  return (
    <>
      <iframe
        tabIndex={-1}
        ref={iframeRef}
        id="dev-frame"
        allowFullScreen
      ></iframe>
      <div id="log-messages">
        <LogPane />
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import * as constants from "../constants";
import { Comms } from "../iframe";
import { SavePathGraphRequest } from "../iframe/request";
import { log } from "../log";
import DevInput from "./DevInput";
import LogPane from "./LogPane";

declare global {
  interface Window {
    gl: {
      markers: {
        record: (slug: string) => void;
        clear: (slug: string) => void;
      };
      nav: {
        clearCache: () => void;
      };
    };
  }
}

export function ShellApp() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [comms, setComms] = useState<Comms | null>(null);

  useEffect(() => {
    if (!comms) return;

    comms.addMessageListener<SavePathGraphRequest>({
      type: "save-path-graph",
      callback: async ({ graph }) => {
        await fetch("/api/pathgraph", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: graph,
        });
      },
    });
  }, [comms]);

  useEffect(() => {
    const iframe = iframeRef.current!;
    const levelUrl = window.location.origin;
    const src = new URL(constants.gameUrl);

    // Copy all search params from parent frame to iframe src
    const parentParams = new URL(window.location.href).searchParams;
    for (const [key, value] of parentParams.entries()) {
      src.searchParams.set(key, value);
    }

    src.searchParams.set("levelBaseUrl", levelUrl);
    log.info(`Loading game from ${constants.gameUrl}`);
    iframe.src = src.toString();

    const comms = new Comms({
      window,
      otherWindow: iframe.contentWindow!,
      role: "parent",
    });
    setComms(comms);
  }, [reloadCount]);

  useEffect(() => {
    if (!comms) return;

    window.gl = {
      markers: {
        record: (slug: string) => {
          log.info({ dev: true }, `Recording marker '${slug}'`);
          comms.request({
            type: "record-marker",
            data: { slug },
          });
        },
        clear: (slug: string) => {
          log.info({ dev: true }, `Clearing marker '${slug}'`);
          comms.request({
            type: "clear-marker",
            data: { slug: slug ?? null },
          });
        },
      },
      nav: {
        clearCache: async () => {
          log.info({ dev: true }, `Clearing navigation cache`);
          await fetch("/api/pathgraph", {
            method: "DELETE",
          });
          window.location.reload();
        },
      },
    };
  }, [comms]);

  useEffect(() => {
    if (import.meta.hot) {
      const fn = () => {
        log.info({ dev: true, color: "green" }, "Reloading level");
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
      <div id="frame-container">
        <iframe
          tabIndex={-1}
          ref={iframeRef}
          id="dev-frame"
          allow="cross-origin-isolated"
          allowFullScreen
        ></iframe>
      </div>
      <div id="log-messages">
        <LogPane maxMessages={300} />
      </div>
      <DevInput />
    </>
  );
}

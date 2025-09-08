import { useEffect, useRef, useState } from "react";
import * as constants from "../constants";
import { useCommsContext } from "../context/comms";
import { Comms } from "../iframe";
import { SavePathGraphRequest } from "../iframe/request";
import { log } from "../log";

export default function PreviewTab() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { comms, setComms } = useCommsContext();
  const [reloadCount, setReloadCount] = useState(0);

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
      subWindows: [iframe.contentWindow!],
      role: "parent",
    });
    setComms(comms);
  }, [reloadCount, setComms]);

  return (
    <div id="frame-container">
      <iframe
        tabIndex={-1}
        ref={iframeRef}
        id="dev-frame"
        allow="cross-origin-isolated"
        allowFullScreen
      ></iframe>
    </div>
  );
}

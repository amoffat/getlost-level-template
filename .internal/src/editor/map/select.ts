import { log } from "@/log";
import { subscribeToSelector } from "@/utils/redux";

subscribeToSelector(
  (state) => state.mapEditor.selectedObj,
  (selectedObj) => {
    log.info(`Selected object ${selectedObj}`);
  }
);

import Tip from "../../Tip";

export default function TileReplaceTool() {
  return (
    <>
      <Tip
        tips={[
          "Click and drag to create a new group, replacing any groups under it.",
          "If you make a mistake, just re-drag the area until it's right.",
        ]}
      />
    </>
  );
}

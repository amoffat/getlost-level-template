import Tip from "@/components/Tip";

export default function ZIndexTool() {
  return (
    <>
      <Tip
        tips={[
          "Move the red z-index handles to adjust the z-indices.",
          "If a character is below the handle, it will be drawn in front of the object.",
          "If a character is above the handle, it will be drawn behind the object.",
          "Double click a segment to add a new handle.",
          "Double click a handle to remove it.",
        ]}
      />
    </>
  );
}

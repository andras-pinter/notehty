import { BlockSuiteEditor } from "./editor/BlockSuiteEditor";

export const NotepadView = () => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <BlockSuiteEditor docId="global" />
    </div>
  );
};

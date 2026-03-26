import BlockSuiteEditor from "./editor/BlockSuiteEditor";
import type { WorkItem } from "../invoke";

interface NotepadViewProps {
  onPromote: (item: WorkItem) => void;
}

const NotepadView = ({ onPromote: _onPromote }: NotepadViewProps) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <BlockSuiteEditor docId="global" mode="page" />
    </div>
  );
};

export default NotepadView;

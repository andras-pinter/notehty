import NoteEditor from "./editor/NoteEditor";
import type { WorkItem } from "../invoke";

interface NotepadViewProps {
  onPromote: (item: WorkItem) => void;
}

const NotepadView = ({ onPromote: _onPromote }: NotepadViewProps) => {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <NoteEditor docId="global" />
    </div>
  );
};

export default NotepadView;


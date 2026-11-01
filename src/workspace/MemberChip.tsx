import { useEffect, useState } from "react";
import type * as Y from "yjs";
import { getActiveDoc } from "./activeDoc";
import { getMember, type Member } from "./device";
import { MemberDialog } from "./MemberDialog";
import { upsertMember } from "./schema";

export interface MemberChipProps {
  doc?: Y.Doc | null;
  onChanged?: (member: Member) => void;
}

export function MemberChip({ doc, onChanged }: MemberChipProps) {
  const [member, setMember] = useState<Member | null>(() => getMember());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sync = () => setMember(getMember());
    window.addEventListener("ws:memberchange", sync);
    return () => window.removeEventListener("ws:memberchange", sync);
  }, []);

  if (!member) return null;

  return (
    <>
      <button
        type="button"
        className="ws-member-chip"
        onClick={() => setIsOpen(true)}
        aria-label={`Profile: ${member.name}. Click to edit.`}
      >
        <span className="ws-dot" style={{ backgroundColor: member.color }} aria-hidden="true" />
        <span className="ws-member-chip-name">{member.name}</span>
      </button>
      <MemberDialog
        isOpen={isOpen}
        isDismissable={true}
        initialMember={member}
        onOpenChange={setIsOpen}
        onSaved={(updated) => {
          setMember(updated);
          const targetDoc = doc ?? getActiveDoc();
          if (targetDoc) {
            upsertMember(targetDoc, updated);
          }
          onChanged?.(updated);
        }}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "@/components/delete-button";
import { updateCreator, deleteCreator } from "./actions";

type Creator = {
  id: string;
  name: string;
  handle: string | null;
  platform: string | null;
  email: string | null;
  _count: { deliverables: number };
};

export default function CreatorRow({ creator, canEdit, canDelete }: { creator: Creator; canEdit: boolean; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateCreator(creator.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-ink/50"
      >
        <input className="input" name="name" defaultValue={creator.name} placeholder="Name" required />
        <input className="input" name="handle" defaultValue={creator.handle ?? ""} placeholder="@handle" />
        <input className="input" name="platform" defaultValue={creator.platform ?? ""} placeholder="Platform (e.g. Instagram)" />
        <input className="input" name="email" defaultValue={creator.email ?? ""} placeholder="Email" type="email" />
        <div className="flex items-center gap-2">
          <button className="btn flex-1" type="submit">Save</button>
          <button
            type="button"
            className="text-xs text-muted hover:text-amber px-2 py-1"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const handleDisplay = creator.handle ? (creator.handle.startsWith("@") ? creator.handle : `@${creator.handle}`) : "No handle";
  const platform = creator.platform || "Platform unassigned";

  return (
    <div className="table-row flex items-center justify-between px-5 py-3.5 text-sm group">
      <Link href={`/creators/${creator.id}`} className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-full bg-paper border border-line text-ink flex items-center justify-center font-display font-semibold text-xs uppercase">
          {creator.name.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-ink group-hover:text-gold transition-colors flex items-center gap-2">
            <span>{creator.name}</span>
            {creator.email && (
              <span className="text-[11px] text-muted font-mono hidden sm:inline">({creator.email})</span>
            )}
          </div>
          <div className="text-muted text-xs flex items-center gap-2 mt-0.5 font-mono">
            <span className="text-gold font-medium">{handleDisplay}</span>
            <span>•</span>
            <span>{platform}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4">
        <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-paper text-muted border border-line">
          {creator._count.deliverables} deliverable{creator._count.deliverables === 1 ? "" : "s"}
        </span>

        {canEdit && <button
          className="text-xs text-muted hover:text-lift font-medium transition-colors"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>}

        {canDelete && <DeleteButton
          onDelete={deleteCreator.bind(null, creator.id)}
          confirmMessage={`Remove ${creator.name}? This also removes their ${creator._count.deliverables} deliverable${creator._count.deliverables === 1 ? "" : "s"} and any payouts tied to them.`}
        />}
      </div>
    </div>
  );
}

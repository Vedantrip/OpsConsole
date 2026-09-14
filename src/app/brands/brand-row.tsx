"use client";

import { useState } from "react";
import DeleteButton from "@/components/delete-button";
import { updateBrand, deleteBrand } from "./actions";

type Brand = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  _count: { campaigns: number };
};

export default function BrandRow({ brand, canManage }: { brand: Brand; canManage: boolean }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await updateBrand(brand.id, formData);
          setEditing(false);
        }}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-ink/50"
      >
        <input className="input" name="name" defaultValue={brand.name} placeholder="Brand Name" required />
        <input className="input" name="contactName" defaultValue={brand.contactName ?? ""} placeholder="Contact Name" />
        <input className="input" name="contactEmail" defaultValue={brand.contactEmail ?? ""} placeholder="Contact Email" type="email" />
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

  return (
    <div className="table-row flex items-center justify-between px-5 py-3.5 text-sm group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-paper border border-line text-ink flex items-center justify-center font-display font-semibold text-xs uppercase">
          {brand.name.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-ink group-hover:text-gold transition-colors">
            {brand.name}
          </div>
          <div className="text-muted text-xs flex items-center gap-2 mt-0.5 font-mono">
            <span>Contact: {brand.contactName ?? "Unassigned"}</span>
            {brand.contactEmail && (
              <>
                <span>•</span>
                <span>{brand.contactEmail}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-paper text-muted border border-line">
          {brand._count.campaigns} campaign{brand._count.campaigns === 1 ? "" : "s"}
        </span>

        {canManage && <button
          className="text-xs text-muted hover:text-lift font-medium transition-colors"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>}

        {canManage && <DeleteButton
          onDelete={deleteBrand.bind(null, brand.id)}
          confirmMessage={`Remove ${brand.name}? This also removes its ${brand._count.campaigns} campaign${brand._count.campaigns === 1 ? "" : "s"} and everything linked to them (deliverables, payouts, invoices).`}
        />}
      </div>
    </div>
  );
}

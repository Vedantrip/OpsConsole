"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "@/components/delete-button";
import { acceptBrandTerms, updateBrand, deleteBrand } from "./actions";
import { BRAND_TERMS_VERSION } from "@/lib/brand-terms";

type Brand = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  _count: { campaigns: number };
  termsAcceptances: {
    termsVersion: string;
    acceptedAt: string;
    acceptedByName: string | null;
    acceptedByEmail: string | null;
  }[];
};

export default function BrandRow({ brand, canManage }: { brand: Brand; canManage: boolean }) {
  const [editing, setEditing] = useState(false);
  const acceptance = brand.termsAcceptances[0];
  const termsAccepted = acceptance?.termsVersion === BRAND_TERMS_VERSION;

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
    <div className="table-row px-5 py-3.5 text-sm group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-paper border border-line text-ink flex items-center justify-center font-display font-semibold text-xs uppercase shrink-0">
            {brand.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-ink group-hover:text-gold transition-colors">{brand.name}</div>
            <div className="text-muted text-xs flex flex-wrap items-center gap-2 mt-0.5 font-mono">
              <span>Contact: {brand.contactName ?? "Unassigned"}</span>
              {brand.contactEmail && <><span>•</span><span>{brand.contactEmail}</span></>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-paper text-muted border border-line">
            {brand._count.campaigns} campaign{brand._count.campaigns === 1 ? "" : "s"}
          </span>
          {canManage && (
            <button className="text-xs text-muted hover:text-lift font-medium transition-colors" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {canManage && (
            <DeleteButton
              onDelete={deleteBrand.bind(null, brand.id)}
              confirmMessage={`Remove ${brand.name}? This also removes its ${brand._count.campaigns} campaign${brand._count.campaigns === 1 ? "" : "s"} and everything linked to them (deliverables, payouts, invoices).`}
            />
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted font-semibold">Campaign Terms · v{BRAND_TERMS_VERSION}</div>
          {termsAccepted ? (
            <p className="text-xs text-ink mt-1">
              Accepted {new Date(acceptance.acceptedAt).toLocaleString()} by {acceptance.acceptedByName ?? acceptance.acceptedByEmail ?? "authorized user"}.
            </p>
          ) : (
            <p className="text-xs text-muted mt-1">Not yet recorded for this brand.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/brand-terms" className="text-xs text-muted hover:text-gold underline">Review terms</Link>
          {canManage && !termsAccepted && (
            <form action={async () => { await acceptBrandTerms(brand.id, true); }}>
              <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                <input type="checkbox" required className="h-4 w-4 accent-[var(--gold)]" />
                <span>I confirm the brand has accepted these terms</span>
              </label>
              <button className="btn btn-small mt-2" type="submit">Record acceptance</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

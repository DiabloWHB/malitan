"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  ticketId: string;
  onUploaded?: () => void;
};

export default function UploadAttachment({ ticketId, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();
    if (error || !data?.company_id) throw new Error("No company_id for user");
    return data.company_id as string;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true); setError(null);

    try {
      const companyId = await getCompanyId();

      for (const file of Array.from(files)) {
        const path = `company/${companyId}/tickets/${ticketId}/${Date.now()}-${file.name}`;

        // 1) העלאה ל-Storage
        const { error: upErr } = await supabase
          .storage
          .from("attachments")
          .upload(path, file, { upsert: false });

        if (upErr) throw upErr;

        // 2) הוספת רשומה ב-DB
        const { error: insErr } = await supabase.from("attachments").insert({
          ticket_id: ticketId,
          company_id: companyId,     // הטריגר/מדיניות כבר מכסה, אבל נשלח מפורשות
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type,
          created_by: (await supabase.auth.getUser()).data.user?.id ?? null
        });

        if (insErr) throw insErr;
      }

      onUploaded?.();
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-xl p-3 space-y-2">
      <div className="font-medium">העלה קבצים לקריאה</div>
      <input
        type="file"
        multiple
        accept="image/*,application/pdf,video/mp4"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {busy && <div className="text-sm">מעלה…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

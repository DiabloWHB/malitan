"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  created_at: string | null;
  created_by: string | null;
};

type Props = {
  ticketId: string;
};

export default function AttachmentList({ ticketId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("attachments")
        .select("id,file_name,file_path,file_type,created_at,created_by")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }
      setRows(data as Row[]);

      // צור Signed URLs לכל קובץ (כי ה-Bucket פרטי)
      const pairs: Record<string, string> = {};
      for (const r of data ?? []) {
        if (!r.file_path) continue;
        const { data: urlData } = await supabase
          .storage
          .from("attachments")
          .createSignedUrl(r.file_path, 60 * 60); // שעה
        if (urlData?.signedUrl) pairs[r.id] = urlData.signedUrl;
      }
      if (mounted) setSigned(pairs);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [ticketId]);

  if (loading) return <div className="p-3">טוען קבצים…</div>;
  if (!rows.length) return <div className="p-3 text-sm text-gray-500">אין קבצים לקריאה זו עדיין.</div>;

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
          <div className="truncate">
            <div className="font-medium truncate">{r.file_name ?? "(ללא שם)"}</div>
            <div className="text-xs text-gray-500">{new Date(r.created_at ?? "").toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={signed[r.id]}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 underline text-sm"
            >
              הורדה/צפייה
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";
import { useUserRole } from "../../lib/useUserRole"; // אם יש לך alias "@/lib/..." השתמש בו

export default function AdminPage() {
  const { loading, isAdmin } = useUserRole();

  if (loading) return <div className="p-6">טוען…</div>;
  if (!isAdmin) return <div className="p-6 text-red-700">אין הרשאות גישה (Admin בלבד)</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin controls</h1>
      <div className="rounded-xl border p-4">
        כאן נשים כפתורי ניהול (ייבוא לקוחות, ניהול משתמשים, וכד’)
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) { setRole(null); setLoading(false); }
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!error && mounted) setRole(data?.role ?? null);
      if (mounted) setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isDispatcher: role === "dispatcher",
    isTechnician: role === "technician",
    isReadonly: role === "readonly"
  };
}

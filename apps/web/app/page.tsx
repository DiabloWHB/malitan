"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      let { data, error } = await supabase.from("companies").select("*");
      if (error) console.error(error);
      else setCompanies(data);
    };
    load();
  }, []);

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-4">ברוכים הבאים ל־Malitan 🚀</h1>
      <h2 className="text-lg mb-2">חברות קיימות:</h2>
      <ul className="list-disc ml-6">
        {companies.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
    </main>
  );
}

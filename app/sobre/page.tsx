import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PackOpener } from "@/components/PackOpener";
import { openPack } from "@/app/actions";
import { getUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { nextPackAt, todayUtc } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.pack.title };
}

export default async function SobrePage() {
  const [{ supabase, user }, { t }] = await Promise.all([getUser(), getT()]);
  const demo = !supabase;
  if (supabase && !user) redirect("/?error=needLogin");

  let openedToday = false;
  if (supabase && user) {
    const { data } = await supabase
      .from("pack_openings")
      .select("opened_on")
      .eq("user_id", user.id)
      .eq("opened_on", todayUtc())
      .maybeSingle();
    openedToday = Boolean(data);
  }

  return (
    <main className="min-h-[calc(100dvh-68px)] bg-ink pb-20 md:pb-0">
      <h1 className="sr-only">{t.pack.title}</h1>
      <PackOpener
        demo={demo}
        openedToday={openedToday}
        nextAt={nextPackAt().toISOString()}
        open={demo ? undefined : openPack}
      />
    </main>
  );
}

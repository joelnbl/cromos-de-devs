import { cardByLogin } from "@/lib/data";
import { cardOgImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Cromo de dev: ¿quién me tiene?";

export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  return cardOgImage(await cardByLogin(login));
}

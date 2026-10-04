import { DEMO_CARDS } from "@/lib/demo";
import { cardOgImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Cromos de devs: colecciona devs, que te coleccionen";

export default function Image() {
  return cardOgImage(DEMO_CARDS[0]);
}

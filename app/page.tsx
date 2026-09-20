import { redirect } from "next/navigation";

/** Demo default — mock member (sem Discord token). */
export default function Home() {
  redirect("/c/demo");
}

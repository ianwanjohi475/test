import { redirect } from "next/navigation";

// Phase 6 replaces this with the marketing landing page. For now the root
// sends you into the app shell.
export default function Home() {
  redirect("/dashboard");
}

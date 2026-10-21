import { createRoot } from "react-dom/client";
import Landing from "@/app/page";

// Swaps the prerendered markup for the live React tree so the hero toggle,
// example tabs and version checker work without a Next.js server.
createRoot(document.getElementById("root")!).render(<Landing />);

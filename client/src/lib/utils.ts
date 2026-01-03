import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeRemove(node?: Node | null): void {
  if (!node) return;
  try {
    if ("isConnected" in node && !node.isConnected) return;
    if (typeof (node as Element).remove === "function") {
      (node as Element).remove();
      return;
    }
    const parent = node.parentNode;
    if (parent && (!("contains" in parent) || parent.contains(node))) {
      parent.removeChild(node);
    }
  } catch (error) {
    console.warn("[safeRemove] Failed to remove node:", error);
  }
}

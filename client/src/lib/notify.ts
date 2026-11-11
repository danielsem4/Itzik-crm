import { toast } from "sonner";
import { extractApiError } from "@/lib/apiClient";

/** Toasts the API's human-readable error message (never raw internals). */
export function toastApiError(error: unknown): void {
  toast.error(extractApiError(error).message);
}

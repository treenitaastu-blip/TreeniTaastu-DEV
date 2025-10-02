import { useContext } from "react";
import AuthProvider, { AuthContext, type AuthContextValue } from "@/providers/AuthProvider";

// Re-export default for convenience if some files import the provider from hooks.
export { AuthProvider };
export type { AuthContextValue };

export function useAuth() {
  return useContext(AuthContext);
}
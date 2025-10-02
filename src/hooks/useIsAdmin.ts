// src/hooks/useIsAdmin.ts
import useAccess from "./useAccess";
export function useIsAdmin() {
  const { loading, isAdmin } = useAccess();
  return loading ? null : isAdmin;
}
export default useIsAdmin;

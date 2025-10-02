import React, { createContext, useContext, useState, useCallback } from 'react';

interface DropdownManagerContextType {
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  closeAllDropdowns: () => void;
}

const DropdownManagerContext = createContext<DropdownManagerContextType | undefined>(undefined);

export function DropdownManagerProvider({ children }: { children: React.ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const closeAllDropdowns = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  return (
    <DropdownManagerContext.Provider value={{
      activeDropdown,
      setActiveDropdown,
      closeAllDropdowns
    }}>
      {children}
    </DropdownManagerContext.Provider>
  );
}

export function useDropdownManager() {
  const context = useContext(DropdownManagerContext);
  if (context === undefined) {
    throw new Error('useDropdownManager must be used within a DropdownManagerProvider');
  }
  return context;
}

// Hook for managing individual dropdown state
export function useDropdownState(id: string) {
  const { activeDropdown, setActiveDropdown } = useDropdownManager();
  
  const isOpen = activeDropdown === id;
  
  const toggle = useCallback(() => {
    setActiveDropdown(isOpen ? null : id);
  }, [isOpen, id, setActiveDropdown]);
  
  const close = useCallback(() => {
    setActiveDropdown(null);
  }, [setActiveDropdown]);
  
  return { isOpen, toggle, close };
}

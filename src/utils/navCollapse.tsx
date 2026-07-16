import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type NavCollapseValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
};

const NavCollapseContext = createContext<NavCollapseValue>({
  collapsed: false,
  setCollapsed: () => {},
});

/**
 * Shared collapse state for the bottom bar. The scrolling screens live inside
 * the tab navigator while the bar is rendered beside them, so the scroll
 * handler and the bar can only meet above both.
 */
export const NavCollapseProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const value = useMemo(() => ({ collapsed, setCollapsed }), [collapsed]);
  return (
    <NavCollapseContext.Provider value={value}>
      {children}
    </NavCollapseContext.Provider>
  );
};

export const useNavCollapse = () => useContext(NavCollapseContext);

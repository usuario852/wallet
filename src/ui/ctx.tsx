/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from 'react';

export type View = 'home' | 'movs' | 'plan' | 'ana' | 'settings' | 'look' | 'account' | 'inv' | 'news';
export type Sheet = { kind: string; props?: any } | null;

export type Ctx = {
  view: View; params: any;
  go: (v: View, params?: any) => void;
  back: () => void;
  open: (kind: string, props?: any) => void;
  close: () => void;
  dark: boolean;
  look: any;
  hide: boolean;
  toggleHide: () => void;
  sel: string | null; // cuenta elegida en el Inicio
  setSel: (id: string | null) => void;
};
export const UI = createContext<Ctx>(null as any);
export const useUI = () => useContext(UI);

export function Provider({ value, children }: { value: Ctx; children: React.ReactNode }) {
  return <UI.Provider value={value}>{children}</UI.Provider>;
}

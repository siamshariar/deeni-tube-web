// Globals the desktop sidebar exposes for the header's hamburger button (see CLAUDE.md)
export {};

declare global {
  interface Window {
    __sidebarToggle?: () => void;
    __sidebarGetState?: () => boolean;
  }
}

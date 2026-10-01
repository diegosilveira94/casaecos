// jsdom has no matchMedia. Tests start on the phone layout and switch with this.
let matches = false;
const listeners = new Set<() => void>();

export function setDesktopViewport(isDesktop: boolean): void {
  matches = isDesktop;
  listeners.forEach((listener) => {
    listener();
  });
}

window.matchMedia = (query: string): MediaQueryList =>
  ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }) as unknown as MediaQueryList;

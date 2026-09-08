const AUTH_TOKEN_KEY = 'casaecos.authToken';

export const tokenStorage = {
  get(): string | null {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  },

  set(token: string): void {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  remove(): void {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  },
};

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

import { setDesktopViewport } from './media-query.js';

afterEach(() => {
  setDesktopViewport(false);
});

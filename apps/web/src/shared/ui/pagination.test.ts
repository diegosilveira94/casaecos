import { describe, expect, it } from 'vitest';

import { paginate } from './pagination.js';

const letters = ['a', 'b', 'c', 'd', 'e'];

describe('paginate', () => {
  it('corta a página pedida e diz as posições mostradas', () => {
    expect(paginate(letters, 2, 2)).toEqual({
      items: ['c', 'd'],
      page: 2,
      pageCount: 3,
      firstPosition: 3,
      lastPosition: 4,
      total: 5,
    });
  });

  it('leva para a última página quando a lista encolheu', () => {
    expect(paginate(letters, 9, 2)).toMatchObject({ items: ['e'], page: 3 });
  });

  it('lista vazia tem uma página, sem posições', () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      firstPosition: 0,
      lastPosition: 0,
      total: 0,
    });
  });
});

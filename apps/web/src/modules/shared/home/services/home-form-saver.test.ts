import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HomeResponse } from '@casaecos/shared-types';

import { HomeFormSaver, HomeResponsibleLinkError } from './home-form-saver.js';
import type { HomeService } from './home-service.js';

const stored = { id: 4, name: 'Casa Fé' } as HomeResponse;

const homes = {
  create: vi.fn<HomeService['create']>(),
  update: vi.fn<HomeService['update']>(),
  linkPerson: vi.fn<HomeService['linkPerson']>(),
};
const saver = new HomeFormSaver(homes as unknown as HomeService);

describe('HomeFormSaver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    homes.create.mockResolvedValue(stored);
    homes.update.mockResolvedValue(stored);
    homes.linkPerson.mockResolvedValue({ message: 'ok' });
  });

  it('cria a casa na organização e já vincula o responsável', async () => {
    await expect(
      saver.save(null, { name: '  Casa Fé ', responsibleId: 3, organizationId: 1 }, []),
    ).resolves.toBe(stored);

    expect(homes.create).toHaveBeenCalledWith({
      name: 'Casa Fé',
      responsibleId: 3,
      organizationId: 1,
    });
    expect(homes.linkPerson).toHaveBeenCalledWith(4, 3);
  });

  it('na edição não mexe na organização nem revincula quem já está na casa', async () => {
    await saver.save(4, { name: 'Casa Fé', responsibleId: 3, organizationId: 1 }, [3, 8]);

    expect(homes.update).toHaveBeenCalledWith(4, { name: 'Casa Fé', responsibleId: 3 });
    expect(homes.linkPerson).not.toHaveBeenCalled();
  });

  it('entrega a casa salva quando só o vínculo do responsável falha', async () => {
    homes.linkPerson.mockRejectedValue(new Error('offline'));

    const failure = saver.save(null, { name: 'Casa Fé', responsibleId: 3, organizationId: 1 }, []);

    await expect(failure).rejects.toBeInstanceOf(HomeResponsibleLinkError);
    await expect(failure).rejects.toMatchObject({ home: stored });
  });
});

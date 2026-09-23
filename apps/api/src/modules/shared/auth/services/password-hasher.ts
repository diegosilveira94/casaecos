import { compare, hash } from 'bcryptjs';

/**
 * bcrypt ignora tudo o que passa de 72 bytes: senha mais longa seria truncada em
 * silêncio, e duas senhas diferentes com o mesmo prefixo abririam a mesma conta.
 * O limite é validado na entrada da rota, contando bytes — acento ocupa 2.
 */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  matches(plainPassword: string, passwordHash: string): Promise<boolean>;
}

// 12 rounds: recomendação atual para senha de usuário; ~250ms por hash nesta escala.
const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, SALT_ROUNDS);
  }

  matches(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}

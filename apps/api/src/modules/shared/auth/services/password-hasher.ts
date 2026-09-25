import { compare, hash } from 'bcryptjs';

/**
 * bcrypt silently ignores anything past 72 bytes: a longer password would be
 * truncated without warning, and two passwords sharing a prefix would open the
 * same account. Routes validate the limit in bytes, since an accent takes 2.
 */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;

const SALT_ROUNDS = 12;

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  matches(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, SALT_ROUNDS);
  }

  matches(plainPassword: string, passwordHash: string): Promise<boolean> {
    return compare(plainPassword, passwordHash);
  }
}

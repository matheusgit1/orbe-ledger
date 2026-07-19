import * as crypto from 'crypto';

export class HashGeneratorUtil {
  public static generate(): string {
    return crypto.randomBytes(9).toString('hex');
  }
}
import { SetMetadata } from '@nestjs/common';
import { AuditAction, AuditEntity } from '../../../infra/database/common/enums/audit.enum';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  entity: AuditEntity            ;
  action: AuditAction;
  getEntityId?: (args: any[]) => string;
}

export const Audit = (metadata: AuditMetadata) => {
  return SetMetadata(AUDIT_KEY, metadata);
};

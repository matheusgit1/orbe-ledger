// src/core/accounts/services/institution-identifier.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Account } from 'src/infra/database/entities/account.entity';
import { Organization } from 'src/infra/database/entities/organization.entity';
import { Repository } from 'typeorm';

@Injectable()
export class InstitutionIdentifierService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) { }

  /**
   * Verifica se duas contas são da mesma instituição
   */
  async areSameInstitution(accountId1: string, accountId2: string): Promise<{
    sameInstitution: boolean;
    institutionId?: string;
    institutionType?: string;
    reason?: string;
  }> {
    const account1 = await this.accountRepository.findOne({
      where: { id: accountId1 },
      // relations: ['ledger', 'ledger.organization'],
      relations: { ledger: { organization: true } }
    });

    const account2 = await this.accountRepository.findOne({
      where: { id: accountId2 },
      relations: { ledger: { organization: true } },
    });

    if (!account1 || !account2) {
      return {
        sameInstitution: false,
        reason: 'Account not found',
      };
    }

    // ESTRATÉGIA 1: Mesma organização (Ledger)
    if (account1.ledger.organizationId === account2.ledger.organizationId) {
      return {
        sameInstitution: true,
        institutionId: account1.ledger.organizationId,
        institutionType: 'SAME_ORGANIZATION',
        reason: 'Contas da mesma organização',
      };
    }

    // ESTRATÉGIA 2: Mesmo código de banco (ex: ambos 001 - BB)
    if (account1.bankCode && account2.bankCode &&
      account1.bankCode === account2.bankCode) {
      return {
        sameInstitution: true,
        institutionId: account1.bankCode,
        institutionType: 'SAME_BANK_CODE',
        reason: `Mesmo banco (${account1.bankCode})`,
      };
    }

    // ESTRATÉGIA 3: Mesma instituição (via campo institutionId)
    // if (account1.institutionId && account2.institutionId &&
    //   account1.institutionId === account2.institutionId) {
    //   return {
    //     sameInstitution: true,
    //     institutionId: account1.institutionId,
    //     institutionType: 'SAME_INSTITUTION',
    //     reason: 'Mesma instituição',
    //   };
    // }

    // ESTRATÉGIA 4: Contas internas da própria fintech
    // if (account1.isInternal && account2.isInternal) {
    //   return {
    //     sameInstitution: true,
    //     institutionType: 'INTERNAL',
    //     reason: 'Ambas são contas internas',
    //   };
    // }

    // ESTRATÉGIA 5: Verificar se são do mesmo banco via ISPB
    const ispb1 = await this.getBankISPB(account1.bankCode!);
    const ispb2 = await this.getBankISPB(account2.bankCode!);

    if (ispb1 && ispb2 && ispb1 === ispb2) {
      return {
        sameInstitution: true,
        institutionId: ispb1,
        institutionType: 'SAME_ISPB',
        reason: `Mesmo banco (ISPB: ${ispb1})`,
      };
    }

    return {
      sameInstitution: false,
      reason: 'Instituições diferentes',
    };
  }

  /**
   * Obtém o tipo de transferência baseado nas contas
   */
  async getTransferType(originId: string, destinationId: string): Promise<{
    type: 'INTERNAL' | 'SAME_BANK' | 'DIFFERENT_BANK';
    details: string;
  }> {
    const result = await this.areSameInstitution(originId, destinationId);

    if (result.sameInstitution) {
      if (result.institutionType === 'SAME_ORGANIZATION' ||
        result.institutionType === 'INTERNAL') {
        return {
          type: 'INTERNAL',
          details: 'Transferência interna (mesma organização)',
        };
      }

      if (result.institutionType === 'SAME_BANK_CODE' ||
        result.institutionType === 'SAME_ISPB') {
        return {
          type: 'SAME_BANK',
          details: `Transferência entre contas do mesmo banco (${result.reason})`,
        };
      }
    }

    return {
      type: 'DIFFERENT_BANK',
      details: 'Transferência entre bancos diferentes (TED/DOC)',
    };
  }

  /**
   * Obtém o ISPB (Identificador do Sistema de Pagamentos Brasileiro) do banco
   */
  private async getBankISPB(bankCode: string): Promise<string | null> {
    // Mapeamento de códigos de banco para ISPB
    const bankISPBMap: Record<string, string> = {
      '001': '00000000', // Banco do Brasil
      '033': '90400888', // Santander
      '104': '00000000', // Caixa
      '237': '60746948', // Bradesco
      '341': '60701190', // Itaú
      '356': '00000000', // Real
      '389': '00000000', // Mercantil
      '422': '00000000', // Safra
      '453': '00000000', // Rural
      '633': '00000000', // Rendimento
      '652': '00000000', // Itaú BMG
      '745': '00000000', // Citibank
      '756': '00000000', // Bcoob
    };

    return bankISPBMap[bankCode] || null;
  }
}
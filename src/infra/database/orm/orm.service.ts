import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class OrmService {
  constructor(private readonly dataSource: DataSource) {}

  async getQueryRunner() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return { queryRunner };
  }

  async commit(queryRunner: QueryRunner) {
    await queryRunner.commitTransaction();
  }

  async rollback(queryRunner: QueryRunner) {
    await queryRunner.rollbackTransaction();
  }

  async release(queryRunner: QueryRunner) {
    await queryRunner.release();
  }
}

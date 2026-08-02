import { Test } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { UnitOfWork } from '../../../src/database/unitOfWork';

function createQueryRunnerStub() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
}

describe('UnitOfWork', () => {
  let uow: UnitOfWork;
  let qr: ReturnType<typeof createQueryRunnerStub>;
  let createQueryRunner: jest.Mock;

  beforeEach(async () => {
    qr = createQueryRunnerStub();
    createQueryRunner = jest.fn(() => qr);
    const dataSource = { createQueryRunner } as unknown as DataSource;
    const module = await Test.createTestingModule({
      providers: [{ provide: DataSource, useValue: dataSource }, UnitOfWork],
    }).compile();
    uow = module.get(UnitOfWork);
  });

  it('commits and releases on success', async () => {
    const work = jest.fn((runner: QueryRunner) => Promise.resolve(runner));
    await expect(uow.execute(work)).resolves.toBe(qr);
    expect(work).toHaveBeenCalledTimes(1);
    expect(qr.connect).toHaveBeenCalledTimes(1);
    expect(qr.startTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    expect(qr.rollbackTransaction).not.toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back, re-throws the original error, and releases on failure', async () => {
    const original = new Error('boom');
    const work = jest.fn(() => Promise.reject(original));
    await expect(uow.execute(work)).rejects.toBe(original);
    expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).not.toHaveBeenCalled();
    expect(qr.release).toHaveBeenCalledTimes(1);
  });

  it('creates a fresh queryRunner per call', async () => {
    await uow.execute(() => Promise.resolve('a'));
    await uow.execute(() => Promise.resolve('b'));
    expect(createQueryRunner).toHaveBeenCalledTimes(2);
  });
});

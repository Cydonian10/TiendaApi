import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { AttributesBatchService } from '../../../src/modules/attributes/services/attributes-batch.service';
import { UnitOfWork } from '../../../src/database/unitOfWork';
import { Attribute } from '../../../src/modules/attributes/entities/attribute.entity';
import { CreateAttributeBatchDto } from '../../../src/modules/attributes/dtos/attribute/create-attribute-batch.dto';

function pgError(code: string) {
  const error = new Error(`pg error ${code}`) as Error & { code?: string };
  error.code = code;
  return error;
}

describe('AttributesBatchService', () => {
  let service: AttributesBatchService;
  let attributeRepo: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let valueRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let unitOfWork: { execute: jest.Mock };

  function buildDto(name: string, values: string[]): CreateAttributeBatchDto {
    const dto = new CreateAttributeBatchDto();
    dto.name = name;
    dto.values = values.map((value) => ({ value }));
    return dto;
  }

  beforeEach(async () => {
    attributeRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    valueRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    unitOfWork = {
      execute: jest.fn((work: (qr: QueryRunner) => Promise<unknown>) =>
        work({
          manager: {
            getRepository: jest.fn((entity) =>
              entity === Attribute ? attributeRepo : valueRepo,
            ),
          },
        } as unknown as QueryRunner),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        AttributesBatchService,
        { provide: UnitOfWork, useValue: unitOfWork },
      ],
    }).compile();
    service = module.get(AttributesBatchService);
  });

  it('creates the attribute and inserts all values when it is new', async () => {
    attributeRepo.findOneBy.mockResolvedValue(null);
    attributeRepo.create.mockReturnValue({ id: 1, name: 'Color' });
    attributeRepo.save.mockResolvedValue({ id: 1, name: 'Color' });
    valueRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, value: 'Rojo', attributeId: 1 }]);
    valueRepo.create.mockImplementation(
      (input: { value: string; attributeId: number }) => ({
        id: 1,
        ...input,
      }),
    );
    valueRepo.save.mockResolvedValue({ id: 1, value: 'Rojo' });

    const result = await service.createWithValues(buildDto('Color', ['Rojo']));

    expect(attributeRepo.create).toHaveBeenCalledWith({ name: 'Color' });
    expect(valueRepo.create).toHaveBeenCalledWith({
      value: 'Rojo',
      attribute: { id: 1, name: 'Color' },
      attributeId: 1,
    });
    expect(result.created).toBe(true);
    expect(result.attribute).toEqual({
      id: 1,
      name: 'Color',
      values: [{ id: 1, value: 'Rojo', attributeId: 1 }],
    });
  });

  it('reuses the existing attribute and only inserts new values', async () => {
    attributeRepo.findOneBy.mockResolvedValue({ id: 5, name: 'Color' });
    attributeRepo.save.mockResolvedValue({ id: 5, name: 'Color' });
    valueRepo.find
      .mockResolvedValueOnce([{ id: 1, value: 'Rojo', attributeId: 5 }])
      .mockResolvedValueOnce([
        { id: 1, value: 'Rojo', attributeId: 5 },
        { id: 2, value: 'Azul', attributeId: 5 },
      ]);
    valueRepo.create.mockImplementation(
      (input: { value: string; attributeId: number }) => ({
        id: 2,
        ...input,
      }),
    );
    valueRepo.save.mockResolvedValue({ id: 2, value: 'Azul' });

    const result = await service.createWithValues(
      buildDto('Color', ['Rojo', 'Azul']),
    );

    expect(valueRepo.create).toHaveBeenCalledTimes(1);
    expect(valueRepo.create).toHaveBeenCalledWith({
      value: 'Azul',
      attribute: { id: 5, name: 'Color' },
      attributeId: 5,
    });
    expect(attributeRepo.save).not.toHaveBeenCalled();
    expect(result.created).toBe(false);
  });

  it('throws ConflictException and rolls back when a value is duplicated in the batch', async () => {
    attributeRepo.findOneBy.mockResolvedValue(null);
    attributeRepo.create.mockReturnValue({ id: 1, name: 'Color' });
    attributeRepo.save.mockResolvedValue({ id: 1, name: 'Color' });
    valueRepo.find.mockResolvedValue([]);
    valueRepo.create.mockImplementation(
      (input: { value: string; attributeId: number }) => ({
        id: 1,
        ...input,
      }),
    );
    valueRepo.save
      .mockResolvedValueOnce({ id: 1, value: 'Rojo' })
      .mockRejectedValueOnce(pgError('23505'));

    await expect(
      service.createWithValues(buildDto('Color', ['Rojo', 'Rojo'])),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(valueRepo.save).toHaveBeenCalledTimes(2);
  });
});

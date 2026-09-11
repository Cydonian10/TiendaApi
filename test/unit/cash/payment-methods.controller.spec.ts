import { PaymentMethodsController } from '@/modules/cash/controllers/payment-methods.controller';
import { ROLES_KEY } from '@/modules/auth/constants';

function rolesMetadata(methodName: string): string[] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(
    PaymentMethodsController.prototype,
    methodName,
  );
  const method: unknown = descriptor?.value;
  return typeof method === 'function'
    ? (Reflect.getMetadata(ROLES_KEY, method) as string[] | undefined)
    : undefined;
}

describe('PaymentMethodsController', () => {
  const service = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };
  const controller = new PaymentMethodsController(service as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns only the active methods provided by the service', async () => {
    service.findAll.mockResolvedValue([
      { id: 1, name: 'Efectivo', active: true },
    ]);

    await expect(controller.findAll()).resolves.toEqual([
      { id: 1, name: 'Efectivo', active: true },
    ]);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('allows operational roles to list methods and keeps mutations administrative', () => {
    expect(rolesMetadata('findAll')).toEqual(['ADMINISTRADOR', 'TRABAJADOR']);
    expect(rolesMetadata('create')).toEqual(['ADMINISTRADOR']);
    expect(rolesMetadata('update')).toEqual(['ADMINISTRADOR']);
    expect(rolesMetadata('activate')).toEqual(['ADMINISTRADOR']);
    expect(rolesMetadata('deactivate')).toEqual(['ADMINISTRADOR']);
  });
});

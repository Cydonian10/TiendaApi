import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function NoDuplicatedUnitIds(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noDuplicatedUnitIds',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) {
            return false;
          }
          const ids = value
            .map((item) =>
              item !== null && typeof item === 'object'
                ? (item as { unitId?: unknown }).unitId
                : undefined,
            )
            .filter((id) => id !== undefined && id !== null);
          return new Set(ids).size === ids.length;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} no puede contener unitId repetidos`;
        },
      },
    });
  };
}

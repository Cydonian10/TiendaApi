import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsExactlyOneMain(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isExactlyOneMain',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!Array.isArray(value)) {
            return false;
          }
          const mains = value.filter(
            (item) =>
              item !== null &&
              typeof item === 'object' &&
              (item as { isMain?: unknown }).isMain === true,
          );
          return mains.length === 1;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe contener exactamente una unidad con isMain: true`;
        },
      },
    });
  };
}

import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function UsernameOrEmailClass(validationOptions?: ValidationOptions) {
    return function (constructor: Function) {
        registerDecorator({
        name: 'UsernameOrEmail',
        target: constructor,
        propertyName: undefined as any, // 👈 evita el error de tipos
        options: validationOptions,
        validator: {
            validate(_: any, args: ValidationArguments) {
            const obj = args.object as any;
            const hasUsername = !!obj.username;
            const hasEmail = !!obj.email;
            return (hasUsername || hasEmail) && !(hasUsername && hasEmail);
            },
            defaultMessage() {
            return 'Debe proporcionar *username* o *email*, pero no ambos.';
            },
        },
        });
    };
}

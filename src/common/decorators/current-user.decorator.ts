import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/entities';

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): User => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
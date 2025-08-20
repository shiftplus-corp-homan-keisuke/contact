declare module 'passport-custom' {
    import { Strategy as PassportStrategy } from 'passport-strategy';
    import { Request } from 'express';

    export interface StrategyOptions {
        passReqToCallback?: boolean;
    }

    export interface VerifyFunction {
        (req: Request, done: (error: any, user?: any, info?: any) => void): void;
    }

    export interface VerifyFunctionWithRequest {
        (req: Request, done: (error: any, user?: any, info?: any) => void): void;
    }

    export class Strategy extends PassportStrategy {
        constructor(verify: VerifyFunction);
        constructor(options: StrategyOptions, verify: VerifyFunctionWithRequest);
    }
}
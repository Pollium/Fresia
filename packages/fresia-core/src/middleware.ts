export interface HttpContext {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string | undefined>;
}

export abstract class Middleware {
    abstract handle(ctx: HttpContext, next: () => Promise<void>): Promise<void>;
}
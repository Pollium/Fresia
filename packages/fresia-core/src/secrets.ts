import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SecretSpec {
    readonly default?: string;

    /** Environments in which this secret MUST be set explicitly (no default). */
    readonly required?: readonly string[];
}

export interface SecretsProviderOpts {
    envFileDir?: string;
    env?: string;
}

export type SecretsSchema = Record<string, SecretSpec>;

export default class SecretsProvider {
    private env: string;
    private values: Record<string, string>;
    
    constructor(schema: SecretsSchema, opts: SecretsProviderOpts = {}) {
        this.env = opts.env ?? process.env.NODE_ENV ?? 'development';

        const fromFile = this.loadEnvFile(opts.envFileDir ?? process.cwd(), this.env);
        const out: Record<string, string> = {};

        for(const key of Object.keys(schema)){
            const spec = schema[key];

            const fromProcess = process.env[key];
            const fromDotEnv = fromFile[key];
            const resolved = fromProcess ?? fromDotEnv ?? spec.default;

            if(resolved === undefined){
                throw new Error(`SecretsProvider: ${key} is not set in process.env or .env.${this.env}, and has no default.`);
            }
            
            if(spec.required?.includes(this.env) && fromProcess == undefined && fromDotEnv == undefined){
                throw new Error(`SecretsProvider: ${key} must be set explicitly in ${this.env} (no default permitted).`);    
            }

            out[key] = resolved;
        }

        this.values = out;
    }

    get(key: string): string{
        return this.values[key];
    }

    private loadEnvFile(dir: string, env: string): Record<string, string>{
        const path = resolve(dir, `.env.${env}`);
        if(!existsSync(path)) return {};

        const content = readFileSync(path, 'utf8');
        const out: Record<string, string> = {};

        for(const raw of content.split('\n')){
            const line = raw.trim();
            if(!line || line.startsWith('#')) continue;

            const eqIdx = line.indexOf('=');
            if(eqIdx === -1) continue;

            const key = line.slice(0, eqIdx).trim();
            let value = line.slice(eqIdx + 1).trim();

            if(
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ){
                value = value.slice(1, -1);
            }

            out[key] = value;
        }

        return out;
    }
}
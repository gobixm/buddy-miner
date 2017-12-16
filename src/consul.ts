import {Config} from "./config/config";

const consul = require("consul");

export class Consul {
    private _client: any;
    private _config: Config;

    constructor(config: Config) {
        this._config = config;
        this._client = consul({
            host: config.consulHost,
            port: config.consulPort,
            defaults: {
                token: config.consulToken
            },
            promisify: true
        });
    }

    async register() {
        await this._client.agent.service.register({
            id: this._config.consulId,
            name: 'miner',
            check: {
                http: `${this._config.hosting}/api/health`,
                interval: '15s',
                tls_skip_verify: true
            }
        });
    }

    async unregister() {
        try {
            await this._client.agent.service.deregister(this._config.consulId);
        }
        catch (e) {
        }
    }

    async getValue(key: string): Promise<any> {
        let result = (await this._client.kv.get(key));
        if (!result) {
            return {};
        }
        return JSON.parse(result.Value);
    }

    async setValue(key: string, value: any): Promise<void> {
        await this._client.kv.set({
            key: key,
            value: JSON.stringify(value)
        });
    }
}
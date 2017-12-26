const consul = require("consul");
const logger = require("./log");

const Consul = class Consul {
    constructor(config) {
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

    async registerAsync() {
        let config = {
            id: this._config.consulId,
            name: "buddy_miner",
            check: {
                http: `${this._config.hosting}/api/health`,
                interval: "15s",
                tls_skip_verify: true
            }
        };
        logger.info("registering service in consul with params...", config);
        try {
            await this._client.agent.service.register(config);
            logger.info("service registered");
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    async unregisterAsync() {
        logger.info("unregistering service in consul...");
        try {
            await this._client.agent.service.deregister(this._config.consulId);
            logger.info("unregistered");
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    async getValueAsync(key) {
        try {
            let result = await this._client.kv.get(key);
            if (!result) {
                return {};
            }
            return JSON.parse(result.Value);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    async setValueAsync(key, value) {
        try {
            await this._client.kv.set({
                key: key,
                value: JSON.stringify(value)
            });
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
};

module.exports = Consul;

const _ = require("lodash");
const logger = require("./../log");
const rc = require("rc");

const Config = class Config {
    constructor() {
        this.Default = {
            consulHost: "localhost",
            consulPort: 9500,
            consulToken: "",
            consulId: "buddy_miner-0",
            hosting: "https://localhost:8000",
            battleNetApiKey: "",
            realms: "howling-fjord",
            locale: "ru_RU",
            kafkaBrokers: "localhost:9092",
            checkIntervalMs: 1000 * 60,
            battleNetUrl: "eu.api.battle.net"
        };
        this._config = {};
    }

    async loadAsync() {
        const config = rc("buddy_miner", this.Default);
        _.merge(this, config);
        config.battleNetApiKey = "*";
        logger.info(config);
    }
};

module.exports = Config;

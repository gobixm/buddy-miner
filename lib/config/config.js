const util = require('util');
const fs = require('fs');
const yargs = require('yargs');
const _ = require('lodash');
const logger = require('./../log');

const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

const Config = class Config {
    constructor() {
        this.Default = {
            consulHost: 'localhost',
            consulPort: 9500,
            consulToken: '',
            consulId: 'miner-0',
            hosting: 'https://localhost:8000',
            battleNetApiKey: '',
            realms: 'howling-fjord',
            locale: 'ru_RU',
            kafkaBrokers: 'localhost:9092',
            checkIntervalMs: 1000 * 60
        };
        this._config = {};
    }

    async loadAsync() {
        let usage = 'Usage:' +
            '--hosting [url]\n' +
            '--consul-host [string]\n' +
            '--consul-port [num]\n' +
            '--consul-token [string]\n' +
            '--consul-id [string]\n' +
            '--config [string]\n' +
            '--battle-net-api-key [string]\n' +
            '--realms [string;string;string]\n' +
            '--locale [string]\n' +
            '--kafka-brokers [string;string]' +
            '--check-interval-ms [num]';
        let argv = yargs
            .usage(usage)
            .argv;

        let config = Config._readArgs(argv);
        config = _.defaultsDeep(config, Config._readEnv());
        try {
            config = _.defaultsDeep(config, Config._readFileAsync(argv.config ? argv.config : 'config.json'));
        } catch (e) {
            console.warn('Failed to load config from file.', e);
        }
        config = _.defaultsDeep(config, this.Default);
        _.merge(this, config);
        config.battleNetApiKey = '*';
        config['battle-net-api-key'] = '*';
        logger.info(config);
    }


    static _readArgs(argv) {
        let config = {};
        return _.assign(config, argv);
    }

    static async _readFileAsync(path) {
        try {
            await stat(path);
        } catch (e) {
            return;
        }

        let content = await readFile(path, 'utf8');
        return Promise.resolve(JSON.parse(content));
    }

    static _readEnv() {
        return {
            consulHost: process.env.BUDDY_CONSUL_HOST,
            consulPort: process.env.BUDDY_CONSUL_PORT,
            consulToken: process.env.BUDDY_CONSUL_TOKEN,
            consulId: process.env.BUDDY_CONSUL_ID,
            hosting: process.env.BUDDY_MINER_HOSTING,
            battleNetApiKey: process.env.BUDDY_MINER_BATTLE_NET_API_KEY,
            realms: process.env.BUDDY_MINER_REALMS,
            locale: process.env.BUDDY_MINER_LOCALE,
            kafkaBrokers: process.env.BUDDY_MINER_KAFKA_BROKERS,
            checkIntervalMs: process.env.BUDDY_MINER_CHECK_INTERVAL_MS,
        }
    }
};

module.exports = Config;

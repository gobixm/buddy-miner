const util = require('util');
const fs = require('fs');
const yargs = require('yargs');


const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

export class Config {
    consulHost: string = 'localhost';
    consulPort: number = 9500;
    consulToken: string = '';
    consulId: string = 'miner-0';
    hosting: string = 'https://localhost:8000';
    battleNetApiKey: string = '';
    realms: string = 'howling-fjord';
    locale: string = 'ru_RU';
    kafkaBrokers: string = 'localhost:9092';

    public async load(): Promise<void> {
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
            '--kafka-brokers [string;string]';
        let argv = yargs
            .usage(usage)
            .argv;

        try {
            await this.loadFromFile(argv.config ? argv.config : 'config.json');
        } catch (e) {
            console.warn('Failed to load config from file.', e);
        }
        this.loadFromEnv();
        this.loadFromArgs(argv);
    }

    private loadFromArgs(argv: any) {
        if (argv.consulHost) {
            this.consulHost = argv.consulHost;
        }
        if (argv.consulPort) {
            this.consulPort = argv.consulPort;
        }
        if (argv.consulToken) {
            this.consulToken = argv.consulToken;
        }
        if (argv.consulId) {
            this.consulId = argv.consulId;
        }
        if (argv.hosting) {
            this.hosting = argv.hosting;
        }
        if (argv.battleNetApiKey) {
            this.battleNetApiKey = argv.battleNetApiKey;
        }
        if (argv.realms) {
            this.realms = argv.realms;
        }
        if (argv.locale) {
            this.locale = argv.locale;
        }
        if (argv.kafkaBrokers) {
            this.kafkaBrokers = argv.kafkaBrokers;
        }
    }

    private async loadFromFile(path: string): Promise<void> {
        try {
            await stat(path);
        } catch (e) {
            return;
        }

        let content = await readFile(path, 'utf8');
        let config = JSON.parse(content);
        Object.assign(this, config);
        return Promise.resolve();
    }

    private loadFromEnv(): void {
        let config: any = {};
        if (process.env.BUDDY_MINER_CONSUL_HOST) {
            config.consulHost = process.env.BUDDY_CONSUL_HOST as string;
        }
        if (process.env.BUDDY_MINER_CONSUL_PORT) {
            config.consulHost = process.env.BUDDY_CONSUL_PORT as string;
        }
        if (process.env.BUDDY_MINER_CONSUL_TOKEN) {
            config.consulHost = process.env.BUDDY_CONSUL_TOKEN as string;
        }
        if (process.env.BUDDY_MINER_CONSUL_ID) {
            config.consulHost = process.env.BUDDY_CONSUL_ID as string;
        }
        if (process.env.BUDDY_MINER_HOSTING) {
            config.hosting = process.env.BUDDY_MINER_HOSTING as string;
        }
        if (process.env.BUDDY_MINER_BATTLE_NET_API_KEY) {
            config.battleNetApiKey = process.env.BUDDY_MINER_BATTLE_NET_API_KEY as string;
        }
        if (process.env.BUDDY_MINER_REALMS) {
            config.realms = process.env.BUDDY_MINER_REALMS as string;
        }
        if (process.env.BUDDY_MINER_LOCALE) {
            config.locale = process.env.BUDDY_MINER_LOCALE as string;
        }
        if (process.env.BUDDY_MINER_KAFKA_BROKERS) {
            config.kafkaBrokers = process.env.BUDDY_MINER_KAFKA_BROKERS as string;
        }
        Object.assign(this, config);
    }
}
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

    public async load(): Promise<void> {
        let argv = yargs
            .usage('Usage: --hosting [url] --consul-host [string] --consul-port [num] --consul-token [string] --consul-id [string] --config [string]')
            .argv;

        try {
            await this.loadFromFile(argv.config ? argv.config : 'config.json');
        } catch (e) {
            console.warn('Failed to load config from file.', e);
        }
        try {
            this.loadFromEnv();
        } catch (e) {
            console.warn('Failed to load config from env.', e);
        }
        this.loadFromArgs(argv);
    }

    private loadFromArgs(argv: any) {
        if(argv.consulHost) {
            this.consulHost = argv.consulHost;
        }
        if(argv.consulPort) {
            this.consulPort = argv.consulPort;
        }
        if(argv.consulToken) {
            this.consulToken = argv.consulToken;
        }
        if(argv.consulId) {
            this.consulId = argv.consulId;
        }
        if(argv.hosting) {
            this.hosting = argv.hosting;
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

    private async loadFromEnv(): Promise<void> {
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
        Object.assign(this, config);
        return Promise.resolve();
    }
}
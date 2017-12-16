import {Config} from "./config/config";
import {Consul} from "./consul";


const axios = require('axios');
const _ = require('lodash');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const kafka = require('kafka-node');
const bb = require("bluebird");

class MineJob {
    worker: Promise<void>;
    timeout: number | NodeJS.Timer;
}

export class Miner {
    _mineJobs: any = {};
    private _stop: boolean;
    private _config: Config;
    private _consul: Consul;

    constructor(config: Config, consul: Consul) {
        this._config = config;
        this._consul = consul;
    }

    async mine() {
        this._config.realms.split(';')
            .forEach(realm => {
                let job = new MineJob();
                job.worker = this.mineRealm(realm, job);
                this._mineJobs[realm] = job;

            });
        await Promise.all(_.values(this._mineJobs)
            .map((job: MineJob) => job.worker));
    }

    async stop() {
        this._stop = true;
        _.values(this._mineJobs)
            .forEach((job: MineJob) => clearTimeout(job.timeout as number));
        await Promise.all(_.values(this._mineJobs)
            .map((job: MineJob) => job.worker));
    }

    private async mineRealm(realm: string, job: MineJob): Promise<void> {
        let url = `https://eu.api.battle.net/wow/auction/data/${realm}?locale=${this._config.locale}&apikey=${this._config.battleNetApiKey}`;

        let res = await axios.get(url);
        let lastModified = new Date(res.data.files[0].lastModified);
        let key = `miner:${realm}:job`;
        let lastProcessed = (await this._consul.getValue(key)).lastProcessed;

        if (!lastProcessed || lastModified > lastProcessed) {
            await this.processData(realm, res.data.files[0].url);
            await this._consul.setValue(key, {lastProcessed: lastModified})
        }
        if (this._stop) {
            return Promise.resolve();
        }
        job.timeout = setTimeout(() => this.mineRealm(realm, job), 1000 * 60 * 10);
    }

    private async processData(realm: string, url: string): Promise<void> {
        let res = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        return new Promise<void>((resolve) => {
            const client = new kafka.KafkaClient({kafkaHost: this._config.kafkaBrokers, clientId: 'buddy-miner'});
            let producer = bb.promisifyAll(new kafka.Producer(client));
            let batch: any[] = [];
            let stream = res.data
                .pipe(JSONStream.parse('auctions.*'))
                .pipe(es.map((data: any, cb: Function) => {
                    batch.push({
                        topic: 'auction-data',
                        messages: JSON.stringify(data),
                        key: realm
                    });
                    if (batch.length % 1000 === 0) {
                        producer.sendAsync(batch)
                            .then(() => cb());
                        batch = [];
                    } else {
                        cb();
                    }
                }));

            stream.on('close', () => {
                if (batch.length) {
                    producer.sendAsync(batch)
                        .then(() => resolve());
                } else {
                    resolve()
                }
            });
        });
    }
}
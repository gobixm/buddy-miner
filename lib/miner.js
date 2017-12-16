const {Config} = require("./config/config");
const {Consul} = require("./consul");

const axios = require('axios');
const _ = require('lodash');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const kafka = require('kafka-node');
const Promise = require("bluebird");

class MineJob {
    constructor() {
        this.worker = undefined;
        this.timeout = undefined;
    }
}

module.exports = class Miner {
    constructor(config, consul) {
        this._config = config;
        this._consul = consul;
        this._mineJobs = {};
        this._stop = false;
    }

    async mine() {
        this._config.realms.split(';')
            .forEach(realm => {
                let job = new MineJob();
                job.worker = this._mineRealm(realm, job);
                this._mineJobs[realm] = job;

            });
        let jobs = _.values(this._mineJobs)
            .map(job => job.worker);
        await Promise.all(jobs);
    }

    async stop() {
        this._stop = true;
        _.values(this._mineJobs)
            .forEach((job) => clearTimeout(job.timeout));
        let jobs = _.values(this._mineJobs)
            .map(job => job.worker);
        await Promise.all(jobs);
    }

    async _mineRealm(realm, job) {
        let url = `https://eu.api.battle.net/wow/auction/data/${realm}?locale=${this._config.locale}&apikey=${this._config.battleNetApiKey}`;

        let res = await axios.get(url);
        let lastModified = new Date(res.data.files[0].lastModified);
        let key = `miner:${realm}:job`;
        let lastProcessed = (await this._consul.getValue(key)).lastProcessed;

        if (!lastProcessed || lastModified > lastProcessed) {
            await this._processData(realm, res.data.files[0].url);
            await this._consul.setValue(key, {lastProcessed: lastModified})
        }
        if (this._stop) {
            return Promise.resolve();
        }
        job.timeout = setTimeout(() => this._mineRealm(realm, job), 1000 * 60 * 10);
    }

    async _processData(realm, url) {
        let res = await axios({
            method: 'get',
            url: url,
            responseType: 'stream'
        });

        return new Promise((resolve) => {
            const client = new kafka.KafkaClient({kafkaHost: this._config.kafkaBrokers, clientId: 'buddy-miner'});
            let producer = Promise.promisifyAll(new kafka.Producer(client));
            let batch = [];
            let stream = res.data
                .pipe(JSONStream.parse('auctions.*'))
                .pipe(es.map((data, cb) => {
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
};
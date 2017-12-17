const Publisher = require('./publisher');

const axios = require('axios');
const _ = require('lodash');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const Promise = require("bluebird");
const logger = require("./log");

class MineJob {
    constructor() {
        this.worker = undefined;
        this.timeout = undefined;
    }
}

const Miner = class Miner {
    constructor(config, consul) {
        this._config = config;
        this._consul = consul;
        this._mineJobs = {};
        this._stop = false;
    }

    async mine() {
        let realms = this._config.realms.split(';');
        logger.info('starting mining...', {realms: realms});
        realms
            .forEach(realm => {
                let job = new MineJob();
                job.worker = this._mineRealm(realm, job);
                this._mineJobs[realm] = job;

            });
        let jobs = _.values(this._mineJobs)
            .map(job => job.worker);
        await Promise.all(jobs);
        logger.info('mining finished');
    }

    async stop() {
        logger.info('stopping mining');
        this._stop = true;
        _.values(this._mineJobs)
            .forEach((job) => clearTimeout(job.timeout));
        let jobs = _.values(this._mineJobs)
            .map(job => job.worker);
        await Promise.all(jobs);
        logger.info('mining stopped');
    }

    async _mineRealm(realm, job) {
        logger.info('mining...', {realm: realm});
        let url = `https://eu.api.battle.net/wow/auction/data/${realm}?locale=${this._config.locale}&apikey=${this._config.battleNetApiKey}`;

        return new Promise(async (resolve) => {
            try {
                let res = await axios.get(url);
                if (!_.some(res.data.files)) {
                    logger.warning('bad auction info response', res);
                    job.timeout = setTimeout(() => this._mineRealm(realm, job), this._config.checkIntervalMs);
                    return;
                }
                let lastModified = new Date(res.data.files[0].lastModified);
                let key = `miner:${realm}:job`;
                let lastProcessed = (await this._consul.getValueAsync(key)).lastProcessed;
                lastProcessed = lastProcessed ? new Date(lastProcessed) : undefined;

                logger.info('checking last modified', {lastProcessed: lastProcessed, lastModified: lastModified});

                if (!lastProcessed || lastModified > lastProcessed) {
                    await this._processData(realm, res.data.files[0].url);
                    await this._consul.setValueAsync(key, {lastProcessed: lastModified})
                }
                if (this._stop) {
                    resolve();
                }

                job.timeout = setTimeout(async () => await this._mineRealm(realm, job), this._config.checkIntervalMs);
            } catch (e) {
                logger.error(e);
                job.timeout = setTimeout(async () => await this._mineRealm(realm, job), this._config.checkIntervalMs);
            }
        });
    }

    async _processData(realm, url) {
        logger.info('getting auction data', {realm: realm, url: url});
        try {
            let res = await axios({
                method: 'get',
                url: url,
                responseType: 'stream'
            });
            logger.info('processing auction data', {realm: realm});
            return new Promise((resolve) => {
                let publisher = new Publisher(this._config.kafkaBrokers);

                let stream = res.data
                    .pipe(JSONStream.parse('auctions.*'))
                    .pipe(es.map((data, cb) => {
                        publisher
                            .publishAsync({
                                topic: 'auction-data',
                                messages: JSON.stringify(data),
                                key: realm
                            })
                            .then(() => cb());
                    }));

                stream.on('close', () => {
                    publisher.flushAsync()
                        .then(() => logger.info('auction data processed', {realm: realm}))
                        .then(() => resolve());
                });
            });
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
};

module.exports = Miner;
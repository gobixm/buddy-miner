const kafka = require("kafka-node");
const Promise = require("bluebird");
const _ = require("lodash");
const logger = require("./log");

const Publisher = class Publisher {
    constructor(brokers) {
        const client = new kafka.KafkaClient({
            kafkaHost: brokers,
            clientId: "buddy-miner"
        });
        this._producer = Promise.promisifyAll(
            new kafka.Producer(client, { partitionerType: 3 })
        );
        this._batch = [];
    }

    async publishAsync(message) {
        this._batch.push(message);
        try {
            if (this._batch.length % 1000 === 0) {
                let batch = this._batch;
                this._batch = [];
                await this._producer.sendAsync(batch);
                logger.info("messages published to kafka", {
                    count: batch.length
                });
            }
        } catch (e) {
            logger.error("failed to publish messages to kafka", { error: e });
            throw e;
        }
    }

    async flushAsync() {
        if (!_.some(this._batch)) {
            return Promise.resolve();
        }
        try {
            await this._producer.sendAsync(this._batch);
            logger.info("messages published to kafka", {
                count: this._batch.length
            });
            this._batch = [];
        } catch (e) {
            logger.error("failed to flush messages to kafka", { error: e });
            throw e;
        }
    }
};

module.exports = Publisher;

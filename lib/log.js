let winston = require('winston');

const {createLogger, format, transports} = require('winston');
const {combine, timestamp, prettyPrint} = format;

const logger = createLogger({
    format: combine(
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'logs/miner.log'})
    ]
});

module.exports = logger;
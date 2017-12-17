const fs = require('fs');
const {URL} = require('url');
const http = require('http');
const http2 = require('http2');
const koa = require('koa');
const Router = require('koa-router');
const winston = require('winston');

const logger = require('./lib/log');
const Config = require('./lib/config/config');
const Consul = require("./lib/consul");
const Miner = require("./lib/miner");


async function bootstrap(consul) {
    logger.info('bootstrapping');
    try {
        await consul.registerAsync();
    } catch (e) {
        logger.error(e);
        process.exit(1);
    }
}

async function serve(config) {
    const app = new koa();
    const router = new Router();

    router.get('/api/health', function (ctx) {
        ctx.body = 'alive';
    });

    app
        .use(router.routes())
        .use(router.allowedMethods());

    const url = new URL(config.hosting);

    if (url.protocol === 'https') {
        const options = {
            key: fs.readFileSync('./config/ssl/miner.key'),
            cert: fs.readFileSync('./config/ssl/miner.crt'),
        };
        logger.info(`start listen on ${url.port} port`);
        http2.createSecureServer(options, app.callback())
            .listen(url.port)
            .on('error', err => logger.error(err));
    } else {
        logger.info(`start listen on ${url.port} port`);
        const server = http.createServer();
        http.createServer(app.callback())
            .listen(url.port)
            .on('error', err => logger.error(err));
    }
}

async function mine(config, consul) {
    let miner = new Miner(config, consul);
    await miner.mine();
}

async function run() {
    logger.info('loading config');
    let config = new Config();
    await config.loadAsync();
    let consul = new Consul(config);
    await bootstrap(consul);
    await serve(config);
    await mine(config, consul);
}

run();

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1)
});


const fs = require('fs');
const {URL} = require('url');
const http = require('http');
const http2 = require('http2');
const koa = require('koa');
const Router = require('koa-router');

const Config = require('./lib/config/config');
const Consul = require("./lib/consul");
const Miner = require("./lib/miner");


async function bootstrap(consul) {
    try {
        await consul.register();
    } catch (e) {
        console.error('Failed to bootstrap.', e);
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
        const server = http2.createSecureServer(options, app.callback());
        server.listen(url.port)
            .on('error', err => console.log(err));
    } else {
        const server = http.createServer();
        http.createServer(app.callback()).listen(url.port);
    }
}

async function mine(config, consul) {
    let miner = new Miner(config, consul);
    await miner.mine();
}

async function run() {
    let config = new Config();
    await config.loadAsync();
    let consul = new Consul(config);
    await bootstrap(consul);
    await serve(config);
    await mine(config, consul);
}

run();


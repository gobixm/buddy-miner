import {Middleware} from "koa";

const fs = require('fs');
const {URL} = require('url');
const http = require('http');
const http2 = require('http2');
const koa = require('koa');
const Router = require('koa-router');

import {Config} from './config/config';
import {Consul} from "./consul";


async function bootstrap(config: Config) {
    try {
        let consul = new Consul(config);
        await consul.register();
    } catch (e) {
        console.error('Failed to bootstrap.', e);
        process.exit(1);
    }
}

async function serve(config: Config) {
    const options = {
        key: fs.readFileSync('./config/ssl/miner.key'),
        cert: fs.readFileSync('./config/ssl/miner.crt'),
    };

    const app = new koa();
    const router = new Router();

    router.get('/api/health', function (ctx: any, next: any) {
        ctx.body = 'alive';
    });

    app
        .use(router.routes())
        .use(router.allowedMethods());

    const url = new URL(config.hosting);

    if (url.protocol === 'https') {
        const server = http2.createSecureServer(options, app.callback());
        server.listen(url.port)
            .on('error', (err: any) => console.log(err));
    } else {
        const server = http.createServer();
        http.createServer(app.callback()).listen(url.port);
    }
}

async function run() {
    let config = new Config();
    await config.load();
    await bootstrap(config);
    await serve(config);
}

run();


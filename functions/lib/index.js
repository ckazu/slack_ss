"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const puppeteer = require("puppeteer");
const request = require("request");
const fs = require("fs");
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_OAUTH_ACCESS_TOKEN;
const web = new WebClient(token);
const filePath = '/tmp/ss.png';
const screenShot = (url) => {
    return puppeteer.launch({ args: ['--no-sandbox'], timeout: 60000 })
        .then((browser) => __awaiter(this, void 0, void 0, function* () {
        console.log('launch browser');
        const page = yield browser.newPage();
        page.setViewport({ width: 1200, height: 800 });
        yield page.goto(url);
        console.log('screenshot - start');
        yield page.screenshot({ path: filePath, fullPage: true });
        console.log('screenshot - finish');
        yield browser.close();
        return filePath;
    }))
        .catch(error => {
        console.error('failed:', error);
        throw new Error(error);
    });
};
const uploadToSlack = (file, body) => {
    console.log('upload to slack');
    return web.files.upload({ channels: body.channel_id, file: fs.createReadStream(file), filename: `${body.url}.png` })
        .then((res) => {
        fs.unlinkSync(file);
        console.log(`file uploaded: ${res.file.id} to ${body.channel_name}, requested by ${body.user_name}`);
    })
        .catch(error => {
        console.error('upload failed:', error);
        throw new Error(error);
    });
};
exports.screenshot = functions.https.onRequest((req, res) => {
    const body = req.body;
    console.log(JSON.stringify(req.body));
    screenShot(body.url)
        .then((filename) => {
        uploadToSlack(filename, body);
    })
        .then(() => {
        res.sendStatus(200);
    })
        .catch(error => {
        console.log(error);
        web.chat.postMessage({ channel: body.channel_id, text: `${body.url} の撮影に失敗しました`, unfurl_links: false });
    });
});
exports.ss = functions.https.onRequest((req, res) => {
    const body = req.body;
    console.log(JSON.stringify(req.body));
    let url = body.text;
    if (!body.text.match(/^http[s]?:\/\//i)) {
        url = 'http://' + url;
    }
    request.post({
        url: process.env.SCREENSHOT_FUNCTIONS_URL,
        headers: { 'Content-Type': 'application/json' },
        json: { url: url,
            channel_id: body.channel_id,
            channel_name: body.channel_name,
            user_name: body.user_name
        }
    }, (_err, _res, _body) => {
        if (_err) {
            console.log(_err, _res, _body);
            res.sendStatus(500);
        }
    });
    res.json({ response_type: 'in_channel', text: `${url} を撮影しに行っています...`, unfurl_links: false });
});
//# sourceMappingURL=index.js.map
#!/usr/bin/env node
import fs = require('fs');
import cli = require('cli');
import path = require('path');
import crypto = require('crypto');

cli.setUsage('VersionBuilder [OPTIONS] <path>');
cli.parse({
    format: ['f', 'output format, supported: json, txt', 'string', 'json'],
});

let output: string;

/**
 * 文件遍历方法
 * @param filePath 需要遍历的文件路径
 */
async function fileDisplay(filePath: string, handler: (file: string) => Promise<void>) {
    let list = await fs.promises.readdir(filePath);
    for (let file of list) {
        if (file == 'node_modules' || file == '.svn' || file == '.git') continue;
        var filedir = path.join(filePath, file);
        if (filedir == output) continue;
        let stats = await fs.promises.stat(filedir)
        if (stats.isFile())
            await handler(filedir);
        else if (stats.isDirectory())
            await fileDisplay(filedir, handler);
    }
}

async function hashFile(filepath: string) {
    //读取一个Buffer
    var buffer = await fs.promises.readFile(filepath);
    var fsHash = crypto.createHash('md5');
    fsHash.update(buffer);
    return fsHash.digest('hex').slice(0, 8); //作为版本作用，只取8位就够了
}


async function build2Json(dir: string) {
    output = path.join(dir, 'version.json')
    let json = {};
    await fileDisplay(dir, async (file: string) => {
        let filename = file.replace(/\\/g, '/'); // 相对路径，斜杠风格
        if (filename.startsWith(dir)) filename = filename.slice(dir.length + 1);
        json[filename] = await hashFile(file);
        console.log(filename, json[filename]);
    });
    console.log('done');
    fs.writeFile(output, JSON.stringify(json), () => { });
}

async function build2Txt(dir: string) {
    output = path.join(dir, 'version.txt');
    let arr = [];
    await fileDisplay(dir, async (file: string) => {
        let filename = file.replace(/\\/g, '/'); // 相对路径，斜杠风格
        if (filename.startsWith(dir)) filename = filename.slice(dir.length + 1);
        arr.push(filename + ":" + await hashFile(file));
    });
    console.log('done');
    arr.sort((a, b) => { return a < b ? -1 : 1; });
    fs.writeFile(output, arr.join('\n'), () => { });
}


let input = cli.args[0] || '.';
switch (cli.options.format) {
    case 'json':
        build2Json(input);
        break;
    case 'txt':
        build2Txt(input);
        break;
}
import { Request, Response } from "express";

module.exports = async (request: Request, response: Response) => {
    DEBUG && console.log("Import url: " + request.url);
    const api = request.query["api"];
    const name = request.query["name"] ?? "大声朗读";
    const voiceName = request.query["voiceName"] ?? "zh-CN-YunxiNeural";
    const voiceFormat = request.query["voiceFormat"] ?? "audio-24khz-48kbitrate-mono-mp3";
    const token = request.query["token"] ?? "";

    const config = [{
        id: Date.now(),
        name: name,
        url: `${api}?&voiceName=${voiceName}&voiceFormat=${voiceFormat}&rate={{speakSpeed}}%&pitch=0%&text={{String(speakText).replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/'/g,'&apos;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}}`
    }];
    response.status(200).json(config);
};

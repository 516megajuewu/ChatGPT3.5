const edge = require('./edge').service;
const azure = require('./azure').service;
/**
 * 
 * @param {*} text  文本 || Hello World
 * @param {*} voice 语音 || zh-CN-XiaoyiNeural
 * @param {*} style 情绪 || affectionate
 * @param {*} rate  语速 || 0
 * @param {*} pitch 语调 || 0
 * @returns 
 */
async function Voice(text = 'Hello World', voice = 'zh-CN-XiaoyiNeural', style = '', rate = '0', pitch = '0') {
    const params = {
        speakText: text,
        voiceName: voice,
        styleName: style,
        styleDegree: '',
        voiceFormat: 'audio-24khz-160kbitrate-mono-mp3',
        lexicon: '',
        rate: rate,
        pitch: pitch,
    };

    let ssml =
        `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">` +
        `<voice name="${params.voiceName}">` +
        (params.lexicon === '' ? '' : `<lexicon uri="${params.lexicon}"/>`) +
        (params.styleName ? `<mstts:express-as style="${params.styleName}" styledegree="${params.styleDegree}">` : ``) +
        `<prosody rate="${params.rate}%" pitch="${params.pitch}%">` + params.speakText + `</prosody>` +
        (params.styleName ? ` </mstts:express-as>` : ``) + `</voice></speak>`;

    //免费接口 https://ms-ra-forwarder.vercel.app/
    //源码地址 https://github.com/wxxxcxx/ms-ra-forwarder

    try {
        return await azure.convert(ssml, params.voiceFormat);
    } catch (error) {
        try{
            return await edge.convert(ssml, params.voiceFormat);
        }catch (error) {}
        return;
    }
}

try {
    require('RPC').api.reg('Voice', Voice);
} catch (error) {}

module.exports = Voice;


// Voice('哎呀! 我是一名可爱的主播! ',
// 'zh-CN-XiaoyiNeural',
// 'affectionate',
// 3,
// 16).then(data => {
//     console.log(data);
// });
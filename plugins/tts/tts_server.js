// tts_server.js

const WebSocket = require('ws');
const config = require('./config');
const { OpusEncoder } = require('@discordjs/opus');
const { ttsList } = require('./tts_list');
const { BytedanceTtsClient } = require('./tts_bytedance');
const { DashscopeTtsClient } = require('./tts_dashscope');

const ttsClients = {
  volcengine: BytedanceTtsClient,
  dashscope: DashscopeTtsClient,
};

const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_FRAME_DURATION = 60;

class RateControlSender {
  constructor(ws) {
    this.ws = ws;
    this.sampleRate = DEFAULT_SAMPLE_RATE;
    this.frameDuration = DEFAULT_FRAME_DURATION;
    this.queue = [];
  }

  setSampleRate(sampleRate) {
    this.sampleRate = sampleRate;
  }

  setFrameDuration(frameDuration) {
    this.frameDuration = frameDuration;
  }

  reset() {
    if (this.rateControlTimeout) {
      clearTimeout(this.rateControlTimeout);
      this.rateControlTimeout = null;
    }
    if (this.queue.length > 0) {
      this.queue = [];
      this.sendStop();
    }

    this.encoder = new OpusEncoder(this.sampleRate, 1);
    this.encoder.applyEncoderCTL(4000, 2048); // VOIP
    this.encodeFrameSize = this.sampleRate / 1000 * this.frameDuration;
    this.audioBuffer = Buffer.alloc(0);
    this.audioPosition = 0;
    this.startTimestamp = Date.now();
  }

  encodeAudio() {
    const pieceLength = this.encodeFrameSize * 2;
    while (this.audioBuffer.length - this.audioPosition >= pieceLength) {
      const frame = this.audioBuffer.subarray(this.audioPosition, this.audioPosition + pieceLength);
      this.audioPosition += pieceLength;
      const opus = this.encoder.encode(frame);
      this.ws.send(opus, { binary: true });
    }
  }

  checkQueue() {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    while (this.queue.length > 0) {
      if (this.queue[0] instanceof Buffer) {
        if (this.rateControlTimeout) {
          break;
        }
        const elapsedMs = Date.now() - this.startTimestamp;
        const outputMs = this.audioPosition / 2 * 1000 / this.sampleRate;
        if (elapsedMs < outputMs) {
          this.rateControlTimeout = setTimeout(() => {
            this.rateControlTimeout = null;
            this.checkQueue();
          }, outputMs - elapsedMs);
          break;
        }
        const pcm = this.queue.shift();
        this.audioBuffer = Buffer.concat([this.audioBuffer, pcm]);
        this.encodeAudio();
      } else {
        this.ws.send(JSON.stringify(this.queue.shift()));
      }
    }
  }

  sendAudio(audio) {
    this.queue.push(audio);
    this.checkQueue();
  }

  sendSentenceStart(text) {
    this.queue.push({ type: 'tts', state: 'sentence_start', text: text });
    this.checkQueue();
  }

  sendSentenceEnd(text) {
    this.queue.push({ type: 'tts', state: 'sentence_end', text: text });
    this.checkQueue();
  }

  sendStart(sampleRate) {
    this.queue.push({ type: 'tts', state: 'start', sample_rate: sampleRate });
    this.checkQueue();
  }

  sendStop() {
    this.queue.push({ type: 'tts', state: 'stop' });
    this.checkQueue();
  }

  close() {
    this.ws.close();
  }
}

class TtsSessionHandler {
  constructor(sender) {
    this.sender = sender;
    this.queueEvents = [];
    this.voice = null;
    this.session = null;
    this.ttsErrorCount = 0;
    this.finished = false;
    this.replyText = '';
  }

  reset(force = false) {
    this.sender.reset();
    if (this.session) {
      if (!this.finished) {
        if (this.session.cancel) {
          this.session.cancel();
        } else {
          this.session.finish(force);
        }
      }
      this.session = null;
    }
    this.ttsErrorCount = 0;
    this.finished = false;
    this.replyText = '';
  }

  async setupTtsSession() {
    const session = this.client.newSession(this.voice, this.sender.sampleRate);
    session.on('sentence_start', (text) => {
      this.sender.sendSentenceStart(text);
    });
    session.on('sentence_end', (text) => {
      this.sender.sendSentenceEnd(text);
    });
    session.on('audio', (pcm) => {
      this.sender.sendAudio(pcm);
    });
    session.on('finished', () => {
      this.sender.sendStop();
      this.session = null;
    });

    if (this.replyText.length > 0) {
      session.write(this.replyText);

      if (this.finished) {
        session.finish();
        return;
      }
    }
    this.session = session;
  }

  handleMessage(message) {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'start':
        console.log('start');

        this.reset();
        this.sender.sendStart();
        if (this.client && this.client.connectionReady) {
          this.setupTtsSession();
        } else {
          this.queueEvents.push({
            resolve: () => this.setupTtsSession(),
          });
        }
        break;

      case 'text':
        console.log('tts text:');
        console.log(data.text);

        this.replyText += data.text;
        if (this.session) {
          this.session.write(data.text);
        }
        break;

      case 'finish':
        console.log('finish');

        this.finished = true;
        if (this.session) {
          this.session.finish();
        }
        break;

      case 'config':
        console.log('config');

        const ttsItem = ttsList.find(item => item.voice_id === data.voice);
        if (!ttsItem) {
          console.error(`无效的语音: ${data.voice}`);
          this.sender.close();
          return;
        }

        this.ttsItem = ttsItem;
        this.voice = data.voice;
        this.sender.setSampleRate(data.sampleRate || DEFAULT_SAMPLE_RATE);
        this.sender.setFrameDuration(data.frameDuration || DEFAULT_FRAME_DURATION);
        this.startClient();
        break;

      case 'abort':
        console.log('abort');

        if (this.session) {
          this.reset(true);
          if (this.client) {
            this.client.close();
          }
          this.startClient();
        } else {
          this.reset(true);
        }
        break;

      case 'exit':
        console.log('exit');

        // 可以在这里处理退出逻辑
        break;

      default:
        console.warn(`未知的消息类型: ${data.type}`);
    }
  }

  startClient() {
    this.client = new ttsClients[this.ttsItem.voice_source]();
    this.client.on('ready', () => {
      while (this.queueEvents.length > 0) {
        const event = this.queueEvents.shift();
        event.resolve();
      }
    });
    this.client.on('error', (error) => {
      console.error('[TTS] client error', error);
    });
    this.client.on('close', () => {
      console.log('[TTS] client closed');
    });
    this.client.on('error', () => {
      this.ttsErrorCount++;
      if (this.ttsErrorCount > 3) {
        this.sender.close();
        return;
      }
      if (this.client && this.client.connectionReady && this.session) {
        this.queueEvents.push({
          resolve: () => this.setupTtsSession(),
        });
        this.startClient();
      }
    });
  }

  handleClose() {
    this.reset();
    if (this.client) {
      this.client.close();
    }
  }
}

class TtsServer {
  constructor() {
    this.wss = null;
  }

  start() {
    this.wss = new WebSocket.Server({ port: config.ttsFrontendPort });

    this.wss.on('connection', (ws) => {
      const sender = new RateControlSender(ws);
      const handler = new TtsSessionHandler(sender);

      ws.on('message', (message) => handler.handleMessage(message));
      ws.on('close', () => handler.handleClose());
    });

    this.wss.on('listening', () => {
      console.log(`TTS 前端服务已启动，监听端口 ${config.ttsFrontendPort}`);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket 服务器错误:', error);
    });
  }

  stop() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('TTS 前端服务已停止');
      });
    }
  }
}

module.exports = TtsServer;

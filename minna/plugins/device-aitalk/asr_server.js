// asrserver.js

const WebSocket = require('ws');
const { WebSocketServer } = require('ws');
const { OpusEncoder } = require('@discordjs/opus');
const config = require('./config');
const AsrWorkerManager = require('./asr_manager');
const { CozeAPI, ChatEventType, RoleType } = require('@coze/api');
var modelDeviceAiTalk = require('./model');
var modelAIRobot = require('../airobot/model');
var modelTTS = require('../tts/model');
var tool = require("../../common/tool");
const axios = require('axios');
const { createSDK } = require("dashscope-node");

class AsrServer {
  constructor() {
    this.wss = null;
    this.manager = new AsrWorkerManager();
    this.ttsServerURL = process.env.TTS_SERVER_URL;
    this.cozeAPIConfig = {
      baseURL: process.env.COZE_CN_BASE_URL,
      token: process.env.COZE_API_TOKEN,
    };
  }

  start() {
    this.wss = new WebSocketServer({ port: config.asrFrontendPort });

    this.wss.on('connection', (ws_esp, req) => this.handleConnection(ws_esp, req));

    this.wss.on('listening', () => {
      console.log(`ASR前端服务器正在监听端口 ${this.wss.options.port}`);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket 服务器错误:', error);
    });
  }

  stop() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('ASR前端服务器已停止');
      });
    }
  }


  async getDeviceKeyGenInfo(deviceId) {
    return new Promise((resolve, reject) => {
      modelDeviceAiTalk.findOne({ key: deviceId }, (err, device) => {
        if (err) {
          reject(err);
        }
        else 
        {
          if (device)
          {
            console.log("device:");
            console.log(device);

            modelAIRobot.findOne({ id: device.airobotid }, (err, robot) => {
              if (err) {
                reject(err); 
              } 
              else
              {
                if (robot) 
                {
                  console.log("robot:");
                  console.log(robot);

                  modelTTS.findOne({ id: device.ttsid }, (err, tts) => {
                    if (err) {
                      reject(err); 
                    }
                    else{
                      if (tts) {
                        console.log("tts:");
                        console.log(tts);

                        var retval= {
                          id:device.id,
                          keygen: device.keygen,
                          user: device.user,
                          airobotid: device.airobotid,
                          ttsid: device.ttsid,

                          type: robot.type,
                          key: robot.key,

                          voice_id: tts.voice_id,
                        };
                        resolve(retval);
                      }
                    }
                  });
                }
                else {
                  reject(new Error('AIRobot not found')); 
                }
              }
            });

          }
          else
          {
            tool.getNewID("device", (ret, newID) => {
              if (ret) {
                console.log("newID:");
                console.log(newID);

                const keygen = tool.encryptInt(newID);
                
                console.log("keygen:");
                console.log(keygen);

                var dev = new modelDeviceAiTalk({
                  id: newID,
                  name: "ESP32 AI Talk",
                  state: 1,
                  key: deviceId,
                  keygen: keygen,
                  user: "",
                  airobotid: "10000",
                  ttsid:"10021",
                  workstate: "",
                  description: ""
                });
                dev.save((err) => {
                  if (err) {
                    reject(err);
                  } else {
                    var retval= {
                      id:newID,
                      keygen: keygen,
                      user: "",
                      airobotid: "10000",
                      ttsid:"10000",
                      type: "0",
                      key: "",
                    };
                    resolve(retval);
                  }
                });
              } else {
                reject(new Error('Failed to generate new ID'));
              }
            });
          }
        }
      });
    });
  }


  async handleConnection(ws_esp, req) {
    console.log('新的ASR客户端连接');
    const worker = this.manager.getWorker();
    if (!worker) {
      console.error('没有可用的ASR工作节点');
      ws_esp.close();
      return;
    }

    const closeHandler = () => {
      ws_esp.close();
    };
    worker.on('close', closeHandler);

    const authorization = req.headers['authorization'];
    const deviceId = req.headers['device-id'];

    console.log('Authorization:', authorization); // 输出 Authorization
    console.log('Device-Id:', deviceId);         // 输出 Device-Id

    var retVal = await this.getDeviceKeyGenInfo(deviceId);
    var idminna = retVal.id;
    var keygen = retVal.keygen;
    var user = retVal.user;
    var airobotid = retVal.airobotid;
    var type = retVal.type;
    var key = retVal.key;
    var ttsid = retVal.ttsid;
    var voice_id = retVal.voice_id;
    
    console.log('idminna:', idminna);
    console.log('Keygen:', keygen);
    console.log('user:', user);
    console.log('airobotid:', airobotid);
    console.log('type:', type);
    console.log('key:', key);
    console.log('ttsid:', ttsid);
    console.log('voice_id:', voice_id);

    // 去掉冒号
    const hexString = deviceId.replace(/:/g, '');
    const decimalValue = parseInt(hexString, 16);
    console.log(decimalValue); // 输出十进制数值

    const decoder = new OpusEncoder(config.decodeSampleRate, 1);
    const sessionASR = worker.newSession();
    sessionASR.Keygen = keygen;
    sessionASR.deviceIdMinna = idminna;
    sessionASR.deviceId = deviceId;
    sessionASR.user = user;
    sessionASR.type = type;
    sessionASR.airobotid = airobotid;
    sessionASR.key = key;
    sessionASR.cozeAPI = null;
    sessionASR.ttsid = ttsid;
    sessionASR.ttsvoiceid = voice_id;

    sessionASR.on('text', async (text, embedding, url, isexist) => {
      console.log(`收到文本: ${text}`);
      console.log(`URL: ${url}`);

      var isregist = sessionASR.user && sessionASR.user!="";
      if (!isregist)
      {
      }
      else
      {
        const savedConversationId = sessionASR.savedConversationId;
        
        if (sessionASR.type==0)
        {
          const cozeAPI = sessionASR.cozeAPI;
          if (cozeAPI) {
            const askData = {
              bot_id: sessionASR.key,
              additional_messages: [
                {
                  role: RoleType.User,
                  user_id: sessionASR.deviceIdMinna,
                  content: text,
                  content_type: 'text',
                },
              ],
            };
            if (savedConversationId) {
              askData.conversation_id = savedConversationId;
            }
            try {
              const stream = await cozeAPI.chat.stream(askData);
              for await (const part of stream) {
                await this.handleChatEvent(part, sessionASR, isexist, ws_esp);
              }
            } catch (error) {
              console.error('处理CozeAPI流时出错:', error);
            }
          }
        }
        else if (sessionASR.type==1)
        { // baidu
          var options = {
            'method': 'POST',
            'url': 'https://qianfan.baidubce.com/v2/app/conversation',
            'headers': {
                    'Content-Type': 'application/json',
                    'X-Appbuilder-Authorization': 'Bearer ' + process.env.QIANFAN_API_KEY
            },
            data: JSON.stringify({
                    "app_id": process.env.QIANFAN_API_ID
              })
          };
          axios(options)
              .then(async response => {
                console.log("-----------------------------");
                console.log(response.data);

                var cvid = null;
                if (savedConversationId)
                {
                  cvid = savedConversationId;
                }
                else
                {
                  cvid = response.data.conversation_id;
                  sessionASR.savedConversationId = cvid;
                }

                console.log("cvid:")
                console.log(cvid);
                
                try {
                  // 配置请求选项
                  const options = {
                    method: 'POST',
                    url: 'https://qianfan.baidubce.com/v2/app/conversation/runs',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Appbuilder-Authorization': 'Bearer ' + process.env.QIANFAN_API_KEY
                    },
                    data: JSON.stringify({
                      "app_id": process.env.QIANFAN_API_ID,
                      "query": text,
                      "conversation_id": cvid,
                      "stream": true
                    }),
                    // 设置 responseType 为 stream，axios 默认不是流式
                    responseType: 'stream'
                  };
            
                  const response = await axios(options);
                  const stream = response.data;
                  let resultBuffer = '';
                  stream.on('data', (chunk) => {
                    const textChunk = chunk.toString();
                    resultBuffer += textChunk;

                    // Parse complete frames (lines) from the buffer
                    let newlineIndex;
                    while ((newlineIndex = resultBuffer.indexOf('\n')) !== -1) 
                    {
                      const frame = resultBuffer.substring(0, newlineIndex);
                      resultBuffer = resultBuffer.substring(newlineIndex + 1);
                      
                      if (frame.trim()) 
                      {
                        try {
                          // 移除 "data: " 前缀
                          const cleanFrame = frame.replace(/^data:\s*/, '');                            
                          const parsedFrame = JSON.parse(cleanFrame);

                          if (parsedFrame.content && parsedFrame.content.length>0)
                          {
                            var content = parsedFrame.content[0];
                            if (content.event_type == "ChatAgent")
                            {
                              if (content.event_status == "preparing")
                              {
                                console.log("preparing");

                                const sktts = sessionASR.sktts;
                                const retVal = { type: 'start' };
                                sktts.send(JSON.stringify(retVal));
                              }
                              else if (content.event_status == "running")
                              {
                                var cnt = parsedFrame.answer;

                                const sktts = sessionASR.sktts;
                                const retVal = { type: 'text', text: cnt };
                                sktts.send(JSON.stringify(retVal));
                      
                                process.stdout.write(cnt);
                              }
                              else if (content.event_status == "done")
                              {
                                console.log("done");

                                setTimeout(() => {
                                  const sktts = sessionASR.sktts;
                                  const retVal = { type: 'finish' };
                                  sktts.send(JSON.stringify(retVal));
                                }, 500);

                                if (isexist) {
                                  setTimeout(() => {
                                    ws_esp.close();
                                  }, 2500);
                                }
                              }
                            }
                          }
                        }
                        catch (err) 
                        {
                          console.error('解析数据帧失败:', err);
                        }
                      }
                    }
                  });
            
                  stream.on('end', () => {
                  });
            
                  stream.on('error', (err) => {
                    console.error('流式传输出错：', err);
                  });
            
                } 
                catch (error) 
                {
                  console.error('请求出错：', error);
                }
            });
        }
        else if (sessionASR.type==2)
        { // aliyun
          if (sessionASR.dashscopeAPI)
          {
            const main = async () => {
              const result = await sessionASR.dashscopeAPI.chat.streamCompletion.request(
                {
                  model: process.env.DASHSCOPE_MODEL_NAME,
                  input: {
                    messages: [
                      {
                        content: text,
                        role: 'user',
                        userId: sessionASR.deviceIdMinna,
                      },
                    ],
                  },
                  parameters: {
                    incremental_output: true,
                  },
                }
              );

              const sktts = sessionASR.sktts;
              const retVal = { type: 'start' };
              sktts.send(JSON.stringify(retVal));
            
              while (true) {
                const { done, value } = await result.read();
            
                if (done) {
                  console.log("done");

                  if (isexist) {
                    setTimeout(() => {
                      ws_esp.close();
                    }, 2500);
                  }

                  return;
                }

                if (value.data)
                {
                  if (value.data.output)
                  {
                    if (value.data.output.finish_reason == "stop")
                    {
                      setTimeout(() => {
                        const sktts = sessionASR.sktts;
                        const retVal = { type: 'finish' };
                        sktts.send(JSON.stringify(retVal));
                      }, 500);
                    }
                    else{
                      var cnt = value.data.output.text;

                      const sktts = sessionASR.sktts;
                      const retVal = { type: 'text', text: cnt };
                      sktts.send(JSON.stringify(retVal));
                    }
                  }
                }
              }
            };
            
            main().catch(console.error);       
          }        
        }
      }
    });

    sessionASR.on('exit', async () => {
      console.log("ASR会话退出");

      setTimeout(() => {
        ws_esp.close();
      }, 2500);
    });

    function sendNoRegist(sessionASR)
    {
      setTimeout(() => {
      const sktts = sessionASR.sktts;
        const retVal = { type: 'start' };
        sktts.send(JSON.stringify(retVal));
      }, 1000);

      setTimeout(() => {
        const sktts = sessionASR.sktts;
        const retVal = { type: 'text', text: "您还未注册,设备ID:" + keygen};
        sktts.send(JSON.stringify(retVal));
      }, 1100);

      setTimeout(() => {
        const sktts = sessionASR.sktts;
        const retVal = { type: 'finish' };
        sktts.send(JSON.stringify(retVal));
      }, 1300);
    }

    ws_esp.on('message', (message, isBinary) => {
      try {
        if (isBinary) {
          const data = decoder.decode(message);
          sessionASR.sendAudio(data);
        } 
        else {
          const json = JSON.parse(message);
  
          console.log("json.type:")
          console.log(json.type)
  
          if(json.type === 'hello'){
            console.log("hello");

            ws_esp.send(JSON.stringify(json));
            console.log(json);
  
            var ttsserverurl = process.env.TTS_SERVER_URL;
            var sktts = new WebSocket(ttsserverurl, {
            });
            sessionASR.sktts = sktts;

            sktts.on('open', function onOpen ()
            {
              console.log("tts-server connect");
        
              var retVal = { 
                type: 'config',
                voice:sessionASR.ttsvoiceid,
                sampleRate:json.sample_rate,
                frameDuration:json.frame_duration,
              };
              var retValStr = JSON.stringify(retVal);
              sktts.send(retValStr);

              var isregist = sessionASR.user && sessionASR.user!="";
              if (!isregist)
              {
                sendNoRegist(sessionASR);
              }
            });
            sktts.on('message', function onMessage(data, isBinary){
              if (isBinary)
              {
                ws_esp.send(data);
              }
              else
              {
                const text = data.toString('utf8');
                ws_esp.send(text);
              }
            });
            sktts.on('error', function onError(err) {
            });
            sktts.on('close', function onClose() {
            });
            sktts.on('upgrade', function onUpgrade(req) {
              console.log("upgrade");
            });
  
            var baseURL = process.env.COZE_CN_BASE_URL
            var token = process.env.COZE_API_TOKEN
            const cozeAPI = new CozeAPI({
              baseURL,
              token
            });
            sessionASR.cozeAPI = cozeAPI;

            const DashScopeAPI = createSDK({
              accessToken: process.env.DASHSCOPE_TOKEN,
            });
            sessionASR.dashscopeAPI = DashScopeAPI;
          }
          else if (json.type === 'listen') {
            var isregist = sessionASR.user && sessionASR.user!="";
            if (!isregist)
            {
              if (json.state == "detect")
              {
                console.log("detect!!!!!!!!!!!!!!!!!!!!!!!!");
              }
            }
            else
            {   
              if (json.state == "detect")
              {
                console.log("detect!!!!!!!!!!!!!!!!!!!!!!!!");
                json.text="你好";
              }
              console.log(json);
              sessionASR.sendJson(json); 
            }
          }
          else if (json.type === 'abort')
          {
            console.log("aborttttttttttttttttttttttt");

            const sktts = sessionASR.sktts;
            const retVal = { type: 'abort' };
            sktts.send(JSON.stringify(retVal));
          }
          else 
          {
            console.error('收到未知消息类型:', json.type);
          }
        }
      } 
      catch (err) {
        console.error('处理消息时出错:', err);
      }
    });

    ws_esp.on('close', () => {
      sessionASR.finish();
      worker.removeListener('close', closeHandler);
      console.log('ASR客户端连接关闭');
    });
  }

  async handleChatEvent(part, sessionASR, isexist, ws_esp) {
    const { ChatEventType } = require('@coze/api');
    const { type, content } = part.data || {};

    switch (part.event) {
      case ChatEventType.CONVERSATION_CHAT_CREATED:
        {
          const cnvId = part.data.conversation_id;
          if (!sessionASR.savedConversationId) {
            sessionASR.savedConversationId = cnvId;
          }

          console.log("CONVERSATION_CHAT_CREATED");

          const sktts = sessionASR.sktts;
          const retVal = { type: 'start' };
          sktts.send(JSON.stringify(retVal));
        }
        break;

      case ChatEventType.CONVERSATION_CHAT_IN_PROGRESS:
        console.log("CONVERSATION_CHAT_IN_PROGRESS");
        break;

      case ChatEventType.CONVERSATION_MESSAGE_COMPLETED:
        break;

      case ChatEventType.CONVERSATION_MESSAGE_DELTA:
        {
          console.log("CONVERSATION_MESSAGE_DELTA");

          var cnt = part.data.content;
          //var cnt = tool.removeEmojis(part.data.content);

          const sktts = sessionASR.sktts;
          const retVal = { type: 'text', text: cnt };
          sktts.send(JSON.stringify(retVal));

          process.stdout.write(cnt);
        }
        break;

      case ChatEventType.CONVERSATION_CHAT_COMPLETED:
        {
          console.log("CONVERSATION_CHAT_COMPLETED");
        }
        break;

      case ChatEventType.CONVERSATION_CHAT_REQUIRES_ACTION:
        {
          console.log("CONVERSATION_CHAT_REQUIRES_ACTION");
        }
        break;

      case ChatEventType.DONE:
        {
          console.log("ChatEventType.DONE:");
          console.log("isexist:");
          console.log(isexist);

          setTimeout(() => {
            const sktts = sessionASR.sktts;
            const retVal = { type: 'finish' };
            sktts.send(JSON.stringify(retVal));
          }, 500);

          if (isexist) {
            setTimeout(() => {
              ws_esp.close();
            }, 2500);
          }
        }
        break;

      // 其他事件类型可以在这里处理
      default:
        console.warn(`未处理的事件类型: ${part.event}`);
    }
  }
}

function splitTextAndCategorize(text) {
    const result = [];
    for (let char of text) {
        //{ char: char, category: getUnicodeCategory(char) }
        result.push(char);
    }
    return result;
}

const CHUNK_SIZE = 1;

function splitTextIntoChunks(text, chunkSize) {

  // 用正则表达式将文本拆分成单个字符或 emoji
  const words = splitTextAndCategorize(text);

  let chunks = [];
  let currentChunk = '';

  console.log("words:");
  console.log(words);
  
  words.forEach(word => {
      if (currentChunk.length + word.length > chunkSize) {
          // 超过最大长度时，将当前块推入数组并开始新的一块
          chunks.push(currentChunk);
          currentChunk = word;
      } else {
          // 否则继续将词语加到当前块
          currentChunk += word;
      }
  });

  // 加入最后的块
  if (currentChunk) {
      chunks.push(currentChunk);
  }

  return chunks;
}

function sendInChunksWithDelay(sessionASR, text, callback) {
  console.log("sendInChunksWithDelay:")
  console.log(text);

  if (text.length <= 3) {
      // 如果字符数小于等于3，直接处理
      console.log("text.length <= 3")

      processText(sessionASR, text);
      callback(true); // 传递 cnt 是否小于 3 的参数
      return;
  }

  let chunks = splitTextIntoChunks(text, CHUNK_SIZE);
  console.log("chunks:");
  console.log(chunks);
  let index = 0;

  function sendChunk() {
      if (index < chunks.length) {
          let chunk = chunks[index++];
          processText(sessionASR, chunk);
          
          // 使用箭头函数来传递 sessionASR
          setTimeout(() => sendChunk(), 200);  // 延时处理下一块
      } else {
          callback(false); // 传递 cnt 是否小于 3 的参数
      }
  }

  sendChunk();
}

function processText(sessionASR, chunk) {
  console.log("processText:");
  console.log(chunk);

  const sktts = sessionASR.sktts;

  const retVal = { type: 'text', text: chunk };
  sktts.send(JSON.stringify(retVal));

  // 输出当前块内容
  process.stdout.write(chunk);
}


module.exports = AsrServer;

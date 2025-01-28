// alicommon.js

const Core = require('@alicloud/pop-core');

var client = new Core({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
});

function requestPhoneCode(phoneNum, template, code, funcallback) {
    var codeStr = ""+code;
    console.log("codeStr");
    console.log(codeStr);

    var params = {
        "PhoneNumbers": phoneNum,
        "SignName":process.env.ALIBABA_CLOUD_PHONE_SIGNNAME,
        "TemplateCode": template,
        "TemplateParam": "{\"code\":\"" + codeStr + "\"}"
    }
    var requestOption = {
        method: 'POST'
    };
    client.request('SendSms', params, requestOption).then((result) => {
        console.log(JSON.stringify(result));
        var code = "";
        funcallback(null, code);
    }, (ex) => {
        console.log(ex);

        funcallback(ex, null);
    })
}

exports.requestPhoneCode = requestPhoneCode;
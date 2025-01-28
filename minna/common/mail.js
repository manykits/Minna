// mail.js

var nodemailer = require('nodemailer')
var smtpTransport = require('nodemailer-smtp-transport');
var mailconfig = require('./mailconfig')

smtpTransport = nodemailer.createTransport(smtpTransport({
    service: mailconfig.email.service,
    auth: {
        user: mailconfig.email.user,
        pass: mailconfig.email.pass
    }
}));

/**
 * @param {String} recipient 收件人
 * @param {String} subject 发送的主题
 * @param {String} html 发送的html内容
 */
var sendMail = function (recipient, subject, html) {

    smtpTransport.sendMail({
        from: mailconfig.email.user,
        to: recipient,
        subject: subject,
        html: html
    }, function (error, response) {
        if (error) {
            console.log(error);
        }
        console.log('send email suc!')
    });
}

module.exports = sendMail;
// mailContent.js

module.exports = {
    //验证码邮件
    codeEmail(code, callback) {
        let mailHtml = `
        <div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        您好</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        </span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">
        该验证码用于邮箱校验，不要将验证码透露给他人</span></div><div><span style="font-family: &quot;lucida Grande&quot;, Verdana, &quot;Microsoft YaHei&quot;;">  
        </span></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        验证码为:</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">${code}
        </font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei"><br></font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        验证码10分钟内有效。</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">
        如果你有任何账号相关的问题，欢迎联系我们manyxu@manykit.com</font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei"><br></font></div><div><font face="lucida Grande, Verdana, Microsoft YaHei">官网：<a href="https://manykit.com">https://manykit.com</a></font></div>`;
        callback(mailHtml);
    }
}
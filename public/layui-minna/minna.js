// minna.js

// setting
layui.define(['laytpl', 'layer', 'element', 'util'], function(exports){
  exports('setting', {
    url:"http://127.0.0.1:6700/"
    //url:"https://manykit.com/minna/"
    ,port:6700
    ,container: 'CONTAINER_MINNA' //Container ID
    ,base: layui.cache.base
    ,views: layui.cache.base + 'tpl/' //Directory for dynamic templates
    ,entry: 'index'
    
    ,name: 'MINNA'
    ,tableName: 'MINNA_TABNAME' //Local storage table name
    ,MOD_NAME: 'MINNA_MODNAME' //Module event name
    
    ,debug: false

    //Custom request fields
    ,request: {
      userName:"MINNA_USERNAME",
      nickName:"MINNA_NICKNAME", 
      tokenName: "MINNA_TOKEN",
      id: "MINNA_ID",
    }
    
    //Custom response fields
    ,response: {
      statusName: 'code' //Field name for data status
      ,statusCode: {
        ok: 0 //Status code for normal data state
        ,logout: 1001 //Status code for invalid login state
      }
      ,msgName: 'msg' //Field name for status message
      ,dataName: 'data' //Field name for data details
    }
    
    ,theme: {
      color: [{
        main: 'rgb(242, 242, 253)'
        ,logo: '#50314F'
        ,selected: 'rgb(242, 242, 253)'
        ,header: '#50314F'
        ,alias: 'purple-red-header' //Purple-red header
      }]

      ,initColorIndex: 0
    }
  });
});

// view
layui.define(['laytpl', 'layer'], function(exports){
  var $ = layui.jquery
  ,laytpl = layui.laytpl
  ,layer = layui.layer
  ,setting = layui.setting
  ,hint = layui.hint()
  
  //External interface
  ,view = function(id){
    return new Class(id);
  }
  
  , LAY_BODY = 'LAY_app_body'
  
  //Constructor
  ,Class = function(id){
    this.id = id;
    this.container = $('#'+(id || LAY_BODY));
  };
  
  //Loading
  view.loading = function(elem){
    elem.append(
      this.elemLoad = $('<i class="layui-anim layui-anim-rotate layui-anim-loop layui-icon layui-icon-loading layminna-loading"></i>')
    );
  };
    
  //Remove loading
  view.removeLoad = function(){
    this.elemLoad && this.elemLoad.remove();
  };
  
  //Clear token and redirect to login page
  view.exit = function(callback){
    //Clear the locally recorded token
    layui.data(setting.tableName, {
      key: setting.request.tokenName
      ,remove: true
    });
    
    //Redirect to the login page
    //location.hash = '/user/login'; 
    callback && callback();
  };
  
  // Ajax request
  view.req = function(options){
    var that = this
    ,success = options.success
    ,error = options.error
    ,request = setting.request
    ,response = setting.response
    ,debug = function(){
      return setting.debug 
        ? '<br><cite>URL：</cite>' + options.url
      : '';
    };
    
    options.data = options.data || {};
    options.headers = options.headers || {};
    
    if(request.tokenName){
      var sendData = typeof options.data === 'string' 
        ? JSON.parse(options.data) 
      : options.data;

      //Automatically pass the default token to the parameters
      options.data[request.tokenName] = request.tokenName in sendData
        ?  options.data[request.tokenName]
      : (layui.data(setting.tableName)[request.tokenName] || '');
      
      //Automatically pass the token to the Request Headers
      options.headers[request.tokenName] = request.tokenName in options.headers 
        ?  options.headers[request.tokenName]
      : (layui.data(setting.tableName)[request.tokenName] || '');
    }
    
    delete options.success;
    delete options.error;

    return $.ajax($.extend({
      type: 'get'
      ,dataType: 'json'
      ,success: function(res){
        var statusCode = response.statusCode;
        
        //Only execute done if the response code is normal
        if(res[response.statusName] == statusCode.ok) {
          typeof options.done === 'function' && options.done(res); 
        } 
        
        //Invalid login status, clear the local access_token, and force redirect to the login page
        else if(res[response.statusName] == statusCode.logout){
          view.exit();
        }
        
        //Other exceptions
        else {
          var errorText = [
            '<cite>Error：</cite> ' + (res[response.msgName] || 'Return status code exception')
            ,debug()
          ].join('');
          view.error(errorText);
        }
        
        //Execute success as long as the http status code is normal, regardless of whether the response code is normal or not
        typeof success === 'function' && success(res);
      }
      ,error: function(e, code){
        var errorText = [
          'Request exception, please try again<br><cite>Error message：</cite>'+ code 
          ,debug()
        ].join('');
        view.error(errorText);
        
        typeof error === 'function' && error.apply(this, arguments);
      }
    }, options));
  };
  
  // Popup
  view.popup = function(options){
    var success = options.success
    ,skin = options.skin;
    
    delete options.success;
    delete options.skin;
    
    return layer.open($.extend({
      type: 1
      ,title: '提示'
      ,content: ''
      ,id: 'LAY-system-view-popup'
      ,skin: 'layui-layer-admin' + (skin ? ' ' + skin : '')
      ,shadeClose: true
      ,closeBtn: false
      ,success: function(layero, index){
        var elemClose = $('<i class="layui-icon" close>&#x1006;</i>');
        layero.append(elemClose);
        elemClose.on('click', function(){
          layer.close(index);
        });
        typeof success === 'function' && success.apply(this, arguments);
      }
    }, options))
  };
  
  // error
  view.error = function(content, options){
    return view.popup($.extend({
      content: content
      ,maxWidth: 300
      //,shade: 0.01
      ,offset: 't'
      ,anim: 6
      ,id: 'LAY_adminError'
    }, options))
  };
  
  
  // template render
  Class.prototype.render = function(views, params){
    var that = this, router = layui.router();
    views = setting.views + views + '.html';
    
    $('#'+ LAY_BODY).children('.layminna-loading').remove();
    view.loading(that.container); //loading
    
    $.ajax({
      url: views
      ,type: 'get'
      ,dataType: 'html'
      ,data: {
        v: layui.cache.version
      }
      ,success: function(html){
        html = '<div>' + html + '</div>';
        
        var elemTitle = $(html).find('title')
        ,title = elemTitle.text() || (html.match(/\<title\>([\s\S]*)\<\/title>/)||[])[1];
        
        var res = {
          title: title
          ,body: html
        };
        
        elemTitle.remove();
        that.params = params || {};
        
        if(that.then){
          that.then(res);
          delete that.then; 
        }

        that.parse(html);
        view.removeLoad();
        
        if(that.done){
          that.done(res);
          delete that.done; 
        }
        
      }
      ,error: function(e){
        view.removeLoad();
        
        if(that.render.isError){
          return view.error('请求视图文件异常，状态：'+ e.status);
        };
        
        if(e.status === 404){
          that.render('template/tips/404');
        } else {
          that.render('template/tips/error');
        }
        
        that.render.isError = true;
      }
    });
    return that;
  };
  
  //Parse template
  Class.prototype.parse = function(html, refresh, callback){
    var that = this
    ,isScriptTpl = typeof html === 'object' //Whether it's a template element
    ,elem = isScriptTpl ? html : $(html)
    ,elemTemp = isScriptTpl ? html : elem.find('*[template]')
    ,fn = function(options){
      var tpl = laytpl(options.dataElem.html())
      ,res = $.extend({
        params: router.params
      }, options.res);
      
      options.dataElem.after(tpl.render(res));
      typeof callback === 'function' && callback();
      
      try {
        options.done && new Function('d', options.done)(res);
      } catch(e){
        console.error(options.dataElem[0], '\nError in callback script\n\n', e)
      }
    }
    ,router = layui.router();
    
    elem.find('title').remove();
    that.container[refresh ? 'after' : 'html'](elem.children());
    
    router.params = that.params || {};
    
    //Traverse template blocks
    for(var i = elemTemp.length; i > 0; i--){
      (function(){
        var dataElem = elemTemp.eq(i - 1)
        ,layDone = dataElem.attr('lay-done') || dataElem.attr('lay-then') //获取回调
        ,url = laytpl(dataElem.attr('lay-url')|| '').render(router) //接口 url
        ,data = laytpl(dataElem.attr('lay-data')|| '').render(router) //接口参数
        ,headers = laytpl(dataElem.attr('lay-headers')|| '').render(router); //接口请求的头信息
        
        try {
          data = new Function('return '+ data + ';')();
        } catch(e) {
          hint.error('lay-data: ' + e.message);
          data = {};
        };
        
        try {
          headers = new Function('return '+ headers + ';')();
        } catch(e) {
          hint.error('lay-headers: ' + e.message);
          headers = headers || {}
        };
        
        if(url){
          view.req({
            type: dataElem.attr('lay-type') || 'get'
            ,url: url
            ,data: data
            ,dataType: 'json'
            ,headers: headers
            ,success: function(res){
              fn({
                dataElem: dataElem
                ,res: res
                ,done: layDone
              });
            }
          });
        } else {
          fn({
            dataElem: dataElem
            ,done: layDone
          });
        }
      }());
    }
    
    return that;
  };
  
  //Auto render data templates
  Class.prototype.autoRender = function(id, callback){
    var that = this;
    $(id || 'body').find('*[template]').each(function(index, item){
      var othis = $(this);
      that.container = othis;
      that.parse(othis, 'refresh');
    });
  };
  
  //Directly render string
  Class.prototype.send = function(views, data){
    var tpl = laytpl(views || this.container.html()).render(data || {});
    this.container.html(tpl);
    return this;
  };
  
  //Partial refresh template
  Class.prototype.refresh = function(callback){
    var that = this
    ,next = that.container.next()
    ,templateid = next.attr('lay-templateid');
    
    if(that.id != templateid) return that;
    
    that.parse(that.container, 'refresh', function(){
      that.container.siblings('[lay-templateid="'+ that.id +'"]:last').remove();
      typeof callback === 'function' && callback();
    });
    
    return that;
  };
  
  //Callback after view request success
  Class.prototype.then = function(callback){
    this.then = callback;
    return this;
  };
  
  //Callback after view rendering complete
  Class.prototype.done = function(callback){
    this.done = callback;
    return this;
  };
  
  exports('view', view);
});

// minna
layui.define(['layer'], function(exports){
  var $ = layui.jquery
  ,laytpl = layui.laytpl
  ,element = layui.element
  ,table = layui.table
  ,upload = layui.upload
  ,setting = layui.setting
  ,view = layui.view
  ,device = layui.device()
  ,hint = layui.hint()
  
  ,$win = $(window), $body = $('body')
  ,container = $('#'+ setting.container)
  
  ,SHOW = 'layui-show', THIS = 'layui-this', DISABLED = 'layui-disabled'
  ,APP_BODY = '#LAY_app_body', APP_FLEXIBLE = 'LAY_app_flexible'
  ,FILTER_TAB_TBAS = 'layminna-layout-tabs'
  ,APP_SPREAD_SM = 'layminna-side-spread-sm', TABS_BODY = 'layminna-tabsbody-item'
  ,ICON_SHRINK = 'layui-icon-shrink-right', ICON_SPREAD = 'layui-icon-spread-left'
  ,SIDE_SHRINK = 'layminna-side-shrink', SIDE_MENU = 'LAY-system-side-menu'

  ,minna = 
  {
    v: '1.0.0'
    
    ,req: view.req
    
    //Clear token and redirect to login page
    ,exit: view.exit
    
    //xss 转义
    ,escape: function(html){
      return String(html || '').replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }
     
    ,on: function(events, callback){
      return layui.onevent.call(this, setting.MOD_NAME, events, callback);
    }
    
    // auth code
    ,sendAuthCode: function(options){
      options = $.extend({
        seconds: 60
        ,elemPhone: '#LAY_phone'
        ,elemVercode: '#LAY_vercode'
      }, options);

      var seconds = options.seconds
      ,btn = $(options.elem)
      ,token = null
      ,timer, countDown = function(loop){
        seconds--;
        if(seconds < 0){
          btn.removeClass(DISABLED).html('获取验证码');
          seconds = options.seconds;
          clearInterval(timer);
        } else {
          btn.addClass(DISABLED).html(seconds + '秒后重获');
        }

        if(!loop){
          timer = setInterval(function(){
            countDown(true);
          }, 1000);
        }
      };
      
      options.elemPhone = $(options.elemPhone);
      options.elemVercode = $(options.elemVercode);

      btn.on('click', function(){
        var elemPhone = options.elemPhone
        ,value = elemPhone.val();

        if(seconds !== options.seconds || $(this).hasClass(DISABLED)) return;

        if(!/^1\d{10}$/.test(value)){
          elemPhone.focus();
          return layer.msg('请输入正确的手机号')
        };
        
        if(typeof options.ajax === 'object'){
          var success = options.ajax.success;
          delete options.ajax.success;
        }
        
        minna.req($.extend(true, {
          url: '/auth/code'
          ,type: 'get'
          ,data: {
            phone: value
          }
          ,success: function(res){
            layer.msg('验证码已发送至你的手机，请注意查收', {
              icon: 1
              ,shade: 0
            });
            options.elemVercode.focus();
            countDown();
            success && success(res);
          }
        }, options.ajax));
      });
    }

    ,sendAuthCodeEmailPhone: function (options) {
      options = $.extend({
        seconds: 60
        , elemEmail: '#MK_email'
        , elemVercode: '#MK_vercode'
      }, options);

      var seconds = options.seconds
        , btn = $(options.elem)
        , token = null
        , timer, countDown = function (loop) {
          seconds--;
          if (seconds < 0) {
            btn.removeClass(DISABLED).html('获取验证码');
            seconds = options.seconds;
            clearInterval(timer);
          } else {
            btn.addClass(DISABLED).html(seconds + '秒后重获');
          }

          if (!loop) {
            timer = setInterval(function () {
              countDown(true);
            }, 1000);
          }
        };

      options.elemEmail = $(options.elemEmail);
      options.elemVercode = $(options.elemVercode);

      btn.on('click', function () {
        var elemEmail = options.elemEmail
          , value = elemEmail.val();

        if (seconds !== options.seconds || $(this).hasClass(DISABLED)) return;

        if (value == "") {
          elemEmail.focus();
          return layer.msg('请输入正确的邮箱号/手机号')
        };

        var isPhone = isPhoneAvailable(value);
        var isMail = isMailAvailable(value);
        if (!isPhone && !isMail) {
           elemEmail.focus();
           return layer.msg('请输入正确的邮箱号/手机号')
        };

        if (typeof options.ajax === 'object') {
          var success = options.ajax.success;
          delete options.ajax.success;
        }

        minna.req($.extend(true, {
          url: '/auth/code'
          , type: 'get'
          , data: {
            emailphone: value
          }
          , success: function (res) {
            if (10==res.data.value)
            {
              var msg = "";
              msg = '帐号已注册';
              layer.msg(msg, {
                icon: 1
                , shade: 0
              });
              options.elemVercode.focus();
              countDown();
              success && success(res);
            }
            else if (0 == res.data.value){
              var msg = "";
              if (isPhone) {
                msg = '验证码已发送至你的手机，请注意查收';
              }
              else if (isMail) {
                msg = '验证码已发送至你的邮箱，请注意查收'
              }
              layer.msg(msg, {
                icon: 1
                , shade: 0
              });
              options.elemVercode.focus();
              countDown();
              success && success(res);
            }
          }
        }, options.ajax));
      });
    }
    
    //Screen type detection
    ,screen: function(){
      var width = $win.width()
      if(width > 1200){
        return 3; //Large screen
      } else if(width > 992){
        return 2; //Medium screen
      } else if(width > 768){
        return 1; //Small screen
      } else {
        return 0; //Extra small screen
      }
    }
    
    //Side menu expand/collapse
    ,sideFlexible: function(status){
      var app = container
      ,iconElem =  $('#'+ APP_FLEXIBLE)
      ,screen = minna.screen();

      //Set state, PC: default expanded, mobile: default collapsed
      if(status === 'spread'){
        //Switch to expanded state icon, arrow: ←
        iconElem.removeClass(ICON_SPREAD).addClass(ICON_SHRINK);
        
        //Mobile: left to right shift; PC: clear extra selectors restore default
        if(screen < 2){
          app.addClass(APP_SPREAD_SM);
        } else {
          app.removeClass(APP_SPREAD_SM);
        }
        
        app.removeClass(SIDE_SHRINK)
      } else {
        //Switch to search state icon, arrow: →
        iconElem.removeClass(ICON_SHRINK).addClass(ICON_SPREAD);
        
        //Mobile: clear extra selectors restore default; PC: right to left collapse
        if(screen < 2){
          app.removeClass(SIDE_SHRINK);
        } else {
          app.addClass(SIDE_SHRINK);
        }
        
        app.removeClass(APP_SPREAD_SM)
      }
      
      layui.event.call(this, setting.MOD_NAME, 'side({*})', {
        status: status
      });
    }
    
    //Right side panel
    ,popupRight: function(options){
      return minna.popup.index = layer.open($.extend({
        type: 1
        ,id: 'LAY_minnaPopupR'
        ,anim: -1
        ,title: false
        ,closeBtn: false
        ,offset: 'r'
        ,shade: 0.1
        ,shadeClose: true
        ,skin: 'layui-anim layui-anim-rl layui-layer-adminRight'
        ,area: '300px'
      }, options));
    }
    
    //Theme settings
    ,theme: function(options){
      var theme = setting.theme
      ,local = layui.data(setting.tableName)
      ,id = 'LAY_layminna_theme'
      ,style = document.createElement('style')
      ,styleText = laytpl([
        //Theme color
        '.layui-side-menu,'
        ,'.layminna-pagetabs .layui-tab-title li:after,'
        ,'.layminna-pagetabs .layui-tab-title li.layui-this:after,'
        ,'.layui-layer-admin .layui-layer-title,'
        ,'.layminna-side-shrink .layui-side-menu .layui-nav>.layui-nav-item>.layui-nav-child'
        ,'{background-color:{{d.color.main}} !important;}'

        //Selected color
        ,'.layui-nav-tree .layui-this,'
        ,'.layui-nav-tree .layui-this>a,'
        ,'.layui-nav-tree .layui-nav-child dd.layui-this,'
        ,'.layui-nav-tree .layui-nav-child dd.layui-this a'
        ,'{background-color:{{d.color.selected}} !important;}'
        
        //Logo
        ,'.layui-layout-minna .layui-logo{background-color:{{d.color.logo || d.color.main}} !important;}'
        
        //Header color
        ,'{{# if(d.color.header){ }}'
          ,'.layui-layout-minna .layui-header{background-color:{{ d.color.header }};}'
          ,'.layui-layout-minna .layui-header a,'
          ,'.layui-layout-minna .layui-header a cite{color: #f8f8f8;}'
          ,'.layui-layout-minna .layui-header a:hover{color: #fff;}'
          ,'.layui-layout-minna .layui-header .layui-nav .layui-nav-more{border-top-color: #fbfbfb;}'
          ,'.layui-layout-minna .layui-header .layui-nav .layui-nav-mored{border-color: transparent; border-bottom-color: #fbfbfb;}'
          ,'.layui-layout-minna .layui-header .layui-nav .layui-this:after, .layui-layout-minna .layui-header .layui-nav-bar{background-color: #fff; background-color: rgba(255,255,255,.5);}'
          ,'.layminna-pagetabs .layui-tab-title li:after{display: none;}'
        ,'{{# } }}'
      ].join('')).render(options = $.extend({}, local.theme, options))
      ,styleElem = document.getElementById(id);
      
      //Add theme styles
      if('styleSheet' in style){
        style.setAttribute('type', 'text/css');
        style.styleSheet.cssText = styleText;
      } else {
        style.innerHTML = styleText;
      }
      style.id = id;
      
      styleElem && $body[0].removeChild(styleElem);
      $body[0].appendChild(style);
      $body.attr('layminna-themealias', options.color.alias);
      
      //Store local records
      local.theme = local.theme || {};
      layui.each(options, function(key, value){
        local.theme[key] = value;
      });
      layui.data(setting.tableName, {
        key: 'theme'
        ,value: local.theme
      }); 
    }
    
    //Initialize theme
    ,initTheme: function(index){
      var theme = setting.theme;
      index = index || 0;
      if(theme.color[index]){
        theme.color[index].index = index;
        minna.theme({
          color: theme.color[index]
        });
      }
    }
    
    //Record the most recently clicked page tab data
    ,tabsPage: {}
    
    //Get page tab main element
    ,tabsBody: function(index){
      return $(APP_BODY).find('.'+ TABS_BODY).eq(index || 0);
    }
    
    //Switch page tab content
    ,tabsBodyChange: function(index, options){
      options = options || {};
      
      minna.tabsBody(index).addClass(SHOW).siblings().removeClass(SHOW);
      events.rollPage('auto', index);
      
      //Execute events under {setting.MOD_NAME}.tabsPage
      layui.event.call(this, setting.MOD_NAME, 'tabsPage({*})', {
        url: options.url
        ,text: options.text
      });
    }
    
    //Resize event management
    ,resize: function(fn){
      var router = layui.router()
      ,key = router.path.join('-');
      
      if(minna.resizeFn[key]){
        $win.off('resize', minna.resizeFn[key]);
        delete minna.resizeFn[key];
      }
      
      if(fn === 'off') return; //If clearing resize event, terminate execution
      
      fn(), minna.resizeFn[key] = fn;
      $win.on('resize', minna.resizeFn[key]);
    }
    ,resizeFn: {}
    ,runResize: function(){
      var router = layui.router()
      ,key = router.path.join('-');
      minna.resizeFn[key] && minna.resizeFn[key]();
    }
    ,delResize: function(){
      this.resize('off');
    }
    
    //Close current
    ,closeThisTabs: function(){
      if(!minna.tabsPage.index) return;
      $(TABS_HEADER).eq(minna.tabsPage.index).find('.layui-tab-close').trigger('click');
    }
    
    //Full screen
    ,fullScreen: function(){
      var ele = document.documentElement
      ,reqFullScreen = ele.requestFullScreen || ele.webkitRequestFullScreen 
      || ele.mozRequestFullScreen || ele.msRequestFullscreen;      
      if(typeof reqFullScreen !== 'undefined' && reqFullScreen) {
        reqFullScreen.call(ele);
      };
    }
    
    //Exit fullscreen
    ,exitScreen: function(){
      var ele = document.documentElement
      if (document.exitFullscreen) {  
        document.exitFullscreen();  
      } else if (document.mozCancelFullScreen) {  
        document.mozCancelFullScreen();  
      } else if (document.webkitCancelFullScreen) {  
        document.webkitCancelFullScreen();  
      } else if (document.msExitFullscreen) {  
        document.msExitFullscreen();  
      }
    }
  };
  
  //events
  var events = minna.events = {

    flexible: function(othis){
      var iconElem = othis.find('#'+ APP_FLEXIBLE)
      ,isSpread = iconElem.hasClass(ICON_SPREAD);
      minna.sideFlexible(isSpread ? 'spread' : null);
    }
    
    ,refresh: function(){
      var ELEM_IFRAME = '.layminna-iframe'
      ,length = $('.'+ TABS_BODY).length;
      
      if(minna.tabsPage.index >= length){
        minna.tabsPage.index = length - 1;
      }
      
      var iframe = minna.tabsBody(minna.tabsPage.index).find(ELEM_IFRAME);
      iframe[0].contentWindow.location.reload(true);
    }

    ,serach: function(othis){
      othis.off('keypress').on('keypress',function(e){
        if(!this.value.replace(/\s/g, '')) return;

        if(e.keyCode === 13){
          var href = othis.attr('lay-action')
          ,text = othis.attr('lay-text') || '搜索';
          
          href = href + this.value;
          text = text + ' <span style="color: #FF5722;">'+ minna.escape(this.value) +'</span>';

          layui.index.openTabsPage(href, text);
          
          events.serach.keys || (events.serach.keys = {});
          events.serach.keys[minna.tabsPage.index] = this.value;
          if(this.value === events.serach.keys[minna.tabsPage.index]){
            events.refresh(othis);
          }
          
          this.value = '';
        }       
      });
    }
    
    ,message: function(othis){
      othis.find('.layui-badge-dot').remove();
    }
    
    ,theme: function(){
      minna.popupRight({
        id: 'LAY_adminPopupTheme'
        ,success: function(){
          view(this.id).render('system/theme')
        }
      });
    }
    
    ,note: function(othis){
      var mobile = minna.screen() < 2
      ,note = layui.data(setting.tableName).note;
      
      events.note.index = minna.popup({
        title: '本地便签'
        ,shade: 0
        ,offset: [
          '41px'
          ,(mobile ? null : (othis.offset().left - 250) + 'px')
        ]
        ,anim: -1
        ,id: 'LAY_adminNote'
        ,skin: 'layminna-note layui-anim layui-anim-upbit'
        ,content: '<textarea placeholder="内容"></textarea>'
        ,resize: false
        ,success: function(layero, index){
          var textarea = layero.find('textarea')
          ,value = note === undefined ? '便签中的内容会存储在本地，这样即便你关掉了浏览器，在下次打开时，依然会读取到上一次的记录。是个非常小巧实用的本地备忘录' : note;
          
          textarea.val(value).focus().on('keyup', function(){
            layui.data(setting.tableName, {
              key: 'note'
              ,value: this.value
            });
          });
        }
      })
    }

    ,fullscreen: function(othis){
      var SCREEN_FULL = 'layui-icon-screen-full'
      ,SCREEN_REST = 'layui-icon-screen-restore'
      ,iconElem = othis.children("i");
      
      if(iconElem.hasClass(SCREEN_FULL)){
        minna.fullScreen();
        iconElem.addClass(SCREEN_REST).removeClass(SCREEN_FULL);
      } else {
        minna.exitScreen();
        iconElem.addClass(SCREEN_FULL).removeClass(SCREEN_REST);
      }
    }

    ,about: function(){
      minna.popupRight({
        id: 'LAY_adminPopupAbout'
        ,success: function(){
          view(this.id).render('system/about');
        }
      });
    }
    
    ,more: function(){
      minna.popupRight({
        id: 'LAY_adminPopupMore'
        ,success: function(){
          view(this.id).render('system/more');
        }
      });
    }
    
    ,back: function(){
      history.back();
    }
    
    ,setTheme: function(othis){
      var index = othis.data('index')
      ,nextIndex = othis.siblings('.layui-this').data('index');
      
      if(othis.hasClass(THIS)) return;
      
      othis.addClass(THIS).siblings('.layui-this').removeClass(THIS);
      minna.initTheme(index);
    }
    
    ,rollPage: function(type, index){
      var tabsHeader = $('#LAY_minna_tabsheader')
      ,liItem = tabsHeader.children('li')
      ,scrollWidth = tabsHeader.prop('scrollWidth')
      ,outerWidth = tabsHeader.outerWidth()
      ,tabsLeft = parseFloat(tabsHeader.css('left'));
      
      //Scroll right to left
      if(type === 'left'){
        if(!tabsLeft && tabsLeft <=0) return;
        
        var  prefLeft = -tabsLeft - outerWidth; 

        liItem.each(function(index, item){
          var li = $(item)
          ,left = li.position().left;
          
          if(left >= prefLeft){
            tabsHeader.css('left', -left);
            return false;
          }
        });
      } else if(type === 'auto'){ //自动滚动
        (function(){
          var thisLi = liItem.eq(index), thisLeft;
          
          if(!thisLi[0]) return;
          thisLeft = thisLi.position().left;
          
          //When target tab is on the left of visible area
          if(thisLeft < -tabsLeft){
            return tabsHeader.css('left', -thisLeft);
          }
          
          //When target tab is on the right of visible area
          if(thisLeft + thisLi.outerWidth() >= outerWidth - tabsLeft){
            var subLeft = thisLeft + thisLi.outerWidth() - (outerWidth - tabsLeft);
            liItem.each(function(i, item){
              var li = $(item)
              ,left = li.position().left;
              
              //Traverse from the second leftmost node in current visible area, if difference after subtracting leftmost node > width of invisible target on right, place that node at leftmost of visible area
              if(left + tabsLeft > 0){
                if(left - tabsLeft > subLeft){
                  tabsHeader.css('left', -left);
                  return false;
                }
              }
            });
          }
        }());
      } else {
        //Default scroll to left
        liItem.each(function(i, item){
          var li = $(item)
          ,left = li.position().left;

          if(left + li.outerWidth() >= outerWidth - tabsLeft){
            tabsHeader.css('left', -left);
            return false;
          }
        });
      }      
    }
    
    ,leftPage: function(){
      events.rollPage('left');
    }
    
    ,rightPage: function(){
      events.rollPage();
    }
    
    ,closeThisTabs: function(){
      var topAdmin = parent === self ? admin : parent.layui.minna;
      topAdmin.closeThisTabs();
    }
    
    ,closeOtherTabs: function(type){
      var TABS_REMOVE = 'LAY-system-pagetabs-remove';
      if(type === 'all'){
        $(TABS_HEADER+ ':gt(0)').remove();
        $(APP_BODY).find('.'+ TABS_BODY+ ':gt(0)').remove();

        $(TABS_HEADER).eq(0).trigger('click');
      } else {
        $(TABS_HEADER).each(function(index, item){
          if(index && index != minna.tabsPage.index){
            $(item).addClass(TABS_REMOVE);
            minna.tabsBody(index).addClass(TABS_REMOVE);
          }
        });
        $('.'+ TABS_REMOVE).remove();
      }
    }
    
    ,closeAllTabs: function(){
      events.closeOtherTabs('all');
      //location.hash = '';
    }
    
    ,shade: function(){
      minna.sideFlexible();
    }
  };
  
  //Initialize
  !function(){
    //Theme initialization, local theme record priority, followed by initColorIndex
    var local = layui.data(setting.tableName);
    if(local.theme){
      minna.theme(local.theme);
    } else if(setting.theme){
      minna.initTheme(setting.theme.initColorIndex);
    }

    //Low version IE warning
    if(device.ie && device.ie < 10){
      view.error('Access may not be optimal in IE'+ device.ie + ', recommended browsers: Chrome / Firefox / Edge', {
        offset: 'auto'
        ,id: 'LAY_errorIE'
      });
    }
  }();
  
  //Monitor tab component switching, sync index
  element.on('tab('+ FILTER_TAB_TBAS +')', function(data){
    minna.tabsPage.index = data.index;
  });
  
  //Monitor tab switching, change menu status
  minna.on('tabsPage(setMenustatus)', function(router){
    var pathURL = router.url, getData = function(item){
      return {
        list: item.children('.layui-nav-child')
        ,a: item.children('*[lay-href]')
      }
    }
    ,sideMenu = $('#'+ SIDE_MENU)
    ,SIDE_NAV_ITEMD = 'layui-nav-itemed'
    
    //Capture corresponding menu
    ,matchMenu = function(list){
      list.each(function(index1, item1){
        var othis1 = $(item1)
        ,data1 = getData(othis1)
        ,listChildren1 = data1.list.children('dd')
        ,matched1 = pathURL === data1.a.attr('lay-href');
        
        listChildren1.each(function(index2, item2){
          var othis2 = $(item2)
          ,data2 = getData(othis2)
          ,listChildren2 = data2.list.children('dd')
          ,matched2 = pathURL === data2.a.attr('lay-href');
          
          listChildren2.each(function(index3, item3){
            var othis3 = $(item3)
            ,data3 = getData(othis3)
            ,matched3 = pathURL === data3.a.attr('lay-href');
            
            if(matched3){
              var selected = data3.list[0] ? SIDE_NAV_ITEMD : THIS;
              othis3.addClass(selected).siblings().removeClass(selected); //标记选择器
              return false;
            }
            
          });

          if(matched2){
            var selected = data2.list[0] ? SIDE_NAV_ITEMD : THIS;
            othis2.addClass(selected).siblings().removeClass(selected); //标记选择器
            return false
          }
          
        });
        
        if(matched1){
          var selected = data1.list[0] ? SIDE_NAV_ITEMD : THIS;
          othis1.addClass(selected).siblings().removeClass(selected); //标记选择器
          return false;
        }
        
      });
    }
    
    //Reset state
    sideMenu.find('.'+ THIS).removeClass(THIS);
    
    //Auto collapse when clicking menu on mobile
    if(minna.screen() < 2) minna.sideFlexible();
    
    //Start capture
    matchMenu(sideMenu.children('li'));
  });
  
  //Monitor side navigation click events
  element.on('nav(layminna-system-side-menu)', function(elem){
    if(elem.siblings('.layui-nav-child')[0] && container.hasClass(SIDE_SHRINK)){
      minna.sideFlexible('spread');
      layer.close(elem.data('index'));
    };
    minna.tabsPage.type = 'nav';
  });
  
  //Monitor more operations for tabs
  element.on('nav(layminna-pagetabs-nav)', function(elem){
    var dd = elem.parent();
    dd.removeClass(THIS);
    dd.parent().removeClass(SHOW);
  });
  
  //Sync router
  var setThisRouter = function(othis){
    var layid = othis.attr('lay-id')
    ,attr = othis.attr('lay-attr')
    ,index = othis.index();
    
    minna.tabsBodyChange(index, {
      url: attr
    });
  }
  ,TABS_HEADER = '#LAY_minna_tabsheader>li';
  
  //Tab title click event
  $body.on('click', TABS_HEADER, function(){
    var othis = $(this)
    ,index = othis.index();
    
    minna.tabsPage.type = 'tab';
    minna.tabsPage.index = index;

    setThisRouter(othis);
  });
  
  //Monitor tabspage deletion
  element.on('tabDelete('+ FILTER_TAB_TBAS +')', function(obj){
    var othis = $(TABS_HEADER+ '.layui-this');
    
    obj.index && minna.tabsBody(obj.index).remove();
    setThisRouter(othis);
    
    //Remove resize event
    minna.delResize();
  });
  
  //Page navigation
  $body.on('click', '*[lay-href]', function(){
    var othis = $(this)
    ,href = othis.attr('lay-href')
    ,text = othis.attr('lay-text')
    ,router = layui.router();
    
    minna.tabsPage.elem = othis;
    //minna.prevRouter[router.path[0]] = router.href; //Record previous menu routing information

    //Execute navigation
    var topLayui = parent === self ? layui : top.layui;
    topLayui.index.openTabsPage(href, text || othis.text());
    
    //If current page, execute refresh
    if(href === minna.tabsBody(minna.tabsPage.index).find('iframe').attr('src')){
      minna.events.refresh();
    }
  });
  
  //Click event
  $body.on('click', '*[layminna-event]', function(){
    var othis = $(this)
    ,attrEvent = othis.attr('layminna-event');
    events[attrEvent] && events[attrEvent].call(this, othis);
  });
  
  //Tips
  $body.on('mouseenter', '*[lay-tips]', function(){
    var othis = $(this);
    
    if(othis.parent().hasClass('layui-nav-item') && !container.hasClass(SIDE_SHRINK)) return;
    
    var tips = othis.attr('lay-tips')
    ,offset = othis.attr('lay-offset') 
    ,direction = othis.attr('lay-direction')
    ,index = layer.tips(tips, this, {
      tips: direction || 1
      ,time: -1
      ,success: function(layero, index){
        if(offset){
          layero.css('margin-left', offset + 'px');
        }
      }
    });
    othis.data('index', index);
  }).on('mouseleave', '*[lay-tips]', function(){
    layer.close($(this).data('index'));
  });
  
  //Window resize event
  var resizeSystem = layui.data.resizeSystem = function(){
    //layer.close(events.note.index);
    layer.closeAll('tips');
    
    if(!resizeSystem.lock){
      setTimeout(function(){
        minna.sideFlexible(minna.screen() < 2 ? '' : 'spread');
        delete resizeSystem.lock;
      }, 100);
    }
    
    resizeSystem.lock = true;
  }
  $win.on('resize', layui.data.resizeSystem);
  
  //Set global component token
  ;!function(){
    var request = setting.request;
    if(request.tokenName){
      var obj = {};
      obj[request.tokenName] = layui.data(setting.tableName)[request.tokenName] || ''
      
      //Table configuration
      table.set({
        headers: obj, //Pass through request headers
        where: obj //Pass through parameters
      });
      //Upload configuration
      upload.set({
        headers: obj, //Pass through request headers
        data: obj //Pass through parameters
      });
    }
  }();

  //Export interface
  exports('minna', minna);
});
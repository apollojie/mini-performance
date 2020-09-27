
/**
 * 监控指标：
 *   1、页面加载时间  performance = window.performance.getEntriesByType('navigation').domComplete
 *   2、资源请求时间  performance = window.performance.getEntriesByType('resource')
 */
 var base = {
   log() {},
   logPackage() {},
   getLoadTime(){},
   getTimeoutRes() {},
   bindEvent(){},
   init(){}
 };

 var pm = (function() {
   if(!window.performance) return base;
   const monitor = {...base};
   const config = {};
   const SEC = 1000;
   const TIMEOUT = 10 * SEC;
   const setTime = (limit = TIMEOUT) => time => time >= limit
   const getLoadTime = ({startTime , responseEnd}) => responseEnd - startTime
   const getName = ({name}) => name

   // 生成表单数据
   const convert2FormData = (data = {}) => Object.entries(data).reduce((last, [key, value]) => {
     if(Array.isArray(value)) {
       return value.reduce((lastResult, item) => {
         lastResult.append(`${key}[]`,item)
         return lastResult
       }, last)
     }
     last.append(key, value)
     return last
   }, new FormData())

   // 拼接get时的url
   const makeItStr = (data = {}) => Object.entries(data).map(([k,v]) => `${k}=${v}`).join('&')

   // 获取页面加载时间
   monitor.getLoadTime = () => {
     const [{domComplete}] = performance.getEntriesByType('navigation')
     return domComplete
   }

   // 获取资源加载时间 单位 ms
   monitor.getResourceTimeoutRes = ({ responseEnd, startTime}) => {
     return responseEnd - startTime
   }

   // 获取加载超时的资源 ，超时时间默认是10s
   monitor.getTimeoutRes = (limit = TIMEOUT) => {
     const isTimeout = setTimeout(limit)
     const resourceTimes = performance.getEntriesByType('resource')
     return resourceTimes.filter(item => isTimeout(getResourceTimeoutRes(item))).map(getName)
   }
   
   function isGetType(method) {
     return method === 'get'
   }

   // 上报数据
   monitor.log = (url, data = {}, type = 'post') => {
     const method = type.toLowerCase()
     const urlToUse = isGetType(method) ? `${url}?${makeItStr(data)}` : url
     const body = isGetType(method) ? {} : {body: convert2FormData(data)}

     const init = {
       method,
       ...body
     };
     fetch(urlToUse, init).catch(e => console.log('发起请求', e))
   } 

   // 封装一个上报两项核心数据的方法
   monitor.logPackage = () => {
     const { url, timeoutUrl, method } = config;
     const domComplete = monitor.getLoadTime();
     const timeoutRes = monitor.getTimeoutRes(config.timeout)

     // 上报页面加载时间
     monitor.log(url, { domComplete }, method)
     // 存在加载超时的资源 && 上报
     if(timeoutRes.length) {
       monitor.log(timeoutUrl, { timeoutRes } , method)
     }
   }

   // 事件绑定
   monitor.bindEvent = () => {
     const oldOnLoad = window.onload;
     window.onload = e => {
       if(oldOnLoad && typeof oldOnLoad === 'function') {
         oldOnLoad(e)
       }

       // 等待线程空闲下来执行，实验中的属性，部分浏览器不支持
       if(window.requestIdleCallback) {
         window.requestIdleCallback(monitor.logPackage)
       } else {
         setTimeout(monitor.logPackage)
       }
     }
   }

   /**
    * @params {object} option
    * @params {string} option.url 页面加载数据的上报地址
    * @params {string} option.timeoutUrl 页面资源超时的上报地址
    * @params {string} [option.method='POST'] 请求方式
    * @params {number} [option.timeout = 10000]
    */

    monitor.init = option => {
      const { url , timeoutUrl , method = 'post', timeout = 10000 } = option;
      const config = {
        url,
        timeoutUrl,
        method,
        timeout
      }
      // 绑定事件，用于触发上报数据
      monitor.bindEvent()

    }
    return monitor
 })();

 pm.init({
   url: "https://github.com/users/ronin0516/feature_preview/indicator_check",
   method: 'get',
   timeoutUrl: "https://github.com/users/ronin0516/feature_preview/indicator_check"
 })
//  export default pm
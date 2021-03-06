import jsonp from 'easy-jsonp';

let proxyPrefix = '';
if (process.env.NODE_ENV === 'development') {
    proxyPrefix = '/dev';
}

//获取登录状态
export function getLoginState() {
  return jsonp({
    url: proxyPrefix + '/sso/getUserLoginState',
    callback: 'jsonp1',
    params: {
      appId: 5
    }
  });
}

//登录
export function ssoLogin(username, password, capchaCode) {
  let params = {
    password,
    way: 'pwd',
    from: 'portal',
    cn: username,
    appId: 5,
  };
  if (capchaCode) {
    params = {
      capchaCode,
      ...params
    };
  }
  return jsonp({
    params,
    url: proxyPrefix + '/sso/login',
    callback: 'jsonp1',
  });
}

//登出
export function ssoLogout(username, noRedirect = true) {
  return jsonp({
    url: proxyPrefix + '/sso/logout',
    callback: 'jsonp1',
    params: {
      noRedirect,
      cn: username,
    }
  });
}

/* 
jsonp({
  url: 'http://localhost',
  // global function named `callback` will be invoked when JSONP response
  callback: 'callback', // any different name from request module
  timeout: 3000,
  params: {
    // eg. ?key0=0&key1=1...
    key0: 0,
    key1: 1
  }
})
  .then(res => console.log(res))
  .catch(err => console.error(err))
*/
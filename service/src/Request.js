var HTTP = require("http"), HTTPS = require("https"), URL = require('url'), QS = require('querystring');

exports.parse = parse;
exports.serialize = serialize;
exports.stringify = function(obj) {
	var str = "";
	for (var i in obj) {
		str += i + "=" + obj[i] + ";"
	}
	return str
}
exports.update = function(old, New) {
	for (var i in New) {
		old[i] = New[i]
	}
}

module.exports = Request;


/* 
    
    请求:
        网址:
        options:{
            body:   {a:1}  -> &a=1
            data:   Buffer || {a:1} -> &a=1
            headers:{cookie:""}
        }
        process:(data)  data为Buffer
    全局:
        Request.autoLocation = ture 自动跳转  默认没有
 */

async function Request(url, options, process = () => { }) {

    /* 无选择请求 */
    if (!options || options instanceof Function) return Request(url, {}, options);

    if (typeof options == "string" || options instanceof Buffer) {
        options = { data: options };
    }
    /*  解析URL      Object.assign(options,URL.parse(url)) 低版本不兼容 */
    var parseUrl = URL.parse(url), resolve;

    for (var i in parseUrl) {
        options[i] = parseUrl[i]
    }

    options.headers = options.headers || {};
    options.cookie && (options.headers.cookie = options.cookie);
    options.method = (options.method || (options.data ? "POST" : "GET"));
    /* {body:{a:1}} 转 ?a=1 */
    if (options.body) {
        options.path += "?" + QS.stringify(options.body);
    }
    /* 同上 当data为buffer 时则不转换 */
    if (options.data) {
        options.data instanceof Object && !(options.data instanceof Buffer) && (options.data = QS.stringify(options.data));
        options.data instanceof Buffer && (options.headers["Content-Length"] = options.data.length);
        // options.headers["Content-Length"] || (options.headers["Content-Length"] = typeof options.data == "string" ? options.data.replace(/[\u0391-\uFFE5]/g, "aa").length : options.data.length);
        options.headers["Content-Type"] || (options.headers["Content-Type"] = 'application/x-www-form-urlencoded; charset=UTF-8');
    }
    //options.headers["User-Agent"] || (options.headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36")
    var req = (parseUrl.protocol == "http:" ? HTTP : HTTPS).request(options, function (res) {
        /* 自动跳转 */
        if (Request.autoLocation && res.headers.location) return Request(res.headers.location, { cookie: options.cookie }, process).then(resolve);
        /* 接收数据 */
        var buf = [];
        res.on('data', function (d) { buf.push(d); process(d) });
        res.on('end', function () {
            res.cookie = Request.CookieMerge(options.cookie || options.headers.cookie, res);
            res.data = Buffer.concat(buf);
            res.text = res.data.toString();
            resolve(res);
        });
        res.on('error', function (err) {resolve(err) });
    })
    req.on('error', function (err) {resolve(err) });
    //超时设置
    options.timeout && req.setTimeout(options.timeout, function () { req.abort() });
    /* POST数据 */
    options.data && req.write(options.data);
    req.end();
    return new Promise((res, rej) => resolve = res)
}

Request.CookieMerge = function (old, res) {
    var oldCookie = exports.parse(old || "", { "decode": (e) => { return e } })
    var list = res.headers["set-cookie"] || []
    for (var i = 0; i < list.length; i++) {
        let itemC = exports.parse(list[i].split(";")[0], { "decode": (e) => { return e } });//.split(";")[0] = 一般cookie 只需要头一个
        for (var o in itemC) oldCookie[o] = itemC[o];
    }
    return exports.stringify(oldCookie)
}






var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

function parse(str, options) {
	if (typeof str !== 'string') {
		throw new TypeError('argument str must be a string');
	}
	var obj = {}
	var opt = options || {};
	var pairs = str.split(pairSplitRegExp);
	var dec = opt.decode || decode;
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i];
		var eq_idx = pair.indexOf('=');
		if (eq_idx < 0) {
			continue
		}
		var key = pair.substr(0, eq_idx).trim() 
        var val = pair.substr(++eq_idx, pair.length).trim();
		if ('"' == val[0]) {
			val = val.slice(1, -1)
		}
		if (undefined == obj[key]) {
			obj[key] = tryDecode(val, dec)
		}
	}
	return obj
}

function serialize(name, val, options) {
	var opt = options || {};
	var enc = opt.encode || encode;
	if (typeof enc !== 'function') {
		throw new TypeError('option encode is invalid');
	}
	if (!fieldContentRegExp.test(name)) {
		throw new TypeError('argument name is invalid');
	}
	var value = enc(val);
	if (value && !fieldContentRegExp.test(value)) {
		throw new TypeError('argument val is invalid');
	}
	var str = name + '=' + value;
	if (null != opt.maxAge) {
		var maxAge = opt.maxAge - 0;
		if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
		str += '; Max-Age=' + Math.floor(maxAge)
	}
	if (opt.domain) {
		if (!fieldContentRegExp.test(opt.domain)) {
			throw new TypeError('option domain is invalid');
		}
		str += '; Domain=' + opt.domain
	}
	if (opt.path) {
		if (!fieldContentRegExp.test(opt.path)) {
			throw new TypeError('option path is invalid');
		}
		str += '; Path=' + opt.path
	}
	if (opt.expires) {
		if (typeof opt.expires.toUTCString !== 'function') {
			throw new TypeError('option expires is invalid');
		}
		str += '; Expires=' + opt.expires.toUTCString()
	}
	if (opt.httpOnly) {
		str += '; HttpOnly'
	}
	if (opt.secure) {
		str += '; Secure'
	}
	if (opt.sameSite) {
		var sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;
		switch (sameSite) {
			case true:
				str += '; SameSite=Strict';
				break;
			case 'lax':
				str += '; SameSite=Lax';
				break;
			case 'strict':
				str += '; SameSite=Strict';
				break;
			default:
				throw new TypeError('option sameSite is invalid');
		}
	}
	return str
}

function tryDecode(str, decode) {
	try {
		return decode(str)
	} catch (e) {
		return str
	}
}




//Request.autoLocation = true
// cookie.parse()

// Request.cookie = function (cookie,setcookies) {



// }
/*
async function test(params) {
    var i = await Request("http://www.baidu.com")
    console.log(i.text);
}
test()
*/

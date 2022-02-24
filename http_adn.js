var fs = require('fs');

function http_request(origin, path, method, ty, bodyString, callback) {
    var options = {
        hostname: conf.cse.host,
        port: conf.cse.port,
        path: path,
        method: method,
        headers: {
            'X-M2M-RI': require('shortid').generate(),
            'Accept': 'application/' + conf.ae.bodytype,
            'X-M2M-Origin': origin,
            'Locale': 'en'
        }
    };

    if(bodyString.length > 0) {
        options.headers['Content-Length'] = bodyString.length;
    }

    if(method === 'post') {
        var a = (ty==='') ? '': ('; ty='+ty);
        options.headers['Content-Type'] = 'application/vnd.onem2m-res+' + conf.ae.bodytype + a;
    }
    else if(method === 'put') {
        options.headers['Content-Type'] = 'application/vnd.onem2m-res+' + conf.ae.bodytype;
    }

    if(conf.usesecure === 'enable') {
        options.ca = fs.readFileSync('ca-crt.pem');
        options.rejectUnauthorized = false;

        var http = require('https');
    }
    else {
        http = require('http');
    }

    var res_body = '';
    var jsonObj = {};
    var req = http.request(options, function (res) {
        //console.log('[crtae response : ' + res.statusCode);

        //res.setEncoding('utf8');

        res.on('data', function (chunk) {
            res_body += chunk;
        });

        res.on('end', function () {
            if(conf.ae.bodytype == 'xml') {
            }
            else if(conf.ae.bodytype == 'cbor') {
            }
            else {
                try {
                    if(res_body == '') {
                        jsonObj = {};
                    }
                    else {
                        jsonObj = JSON.parse(res_body);
                    }
                    callback(res.headers['x-m2m-rsc'], jsonObj);
                }
                catch (e) {
                    console.log(e);
                    console.log('[http_adn] json parse error');
                    jsonObj = {};
                    jsonObj.dbg = res_body;
                    callback(9999, jsonObj);
                }
            }
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        jsonObj = {};
        jsonObj.dbg = e.message;

        callback(9999, jsonObj);
    });

    //console.log(bodyString);

    //console.log(path);

    req.write(bodyString);
    req.end();
}

exports.crtae = function (parent, rn, api, callback) {
    var results_ae = {};

    var bodyString = '';

    if(conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ae['m2m:ae'] = {};
        results_ae['m2m:ae'].api = api;
        results_ae['m2m:ae'].rn = rn;
        results_ae['m2m:ae'].rr = true;
        //results_ae['m2m:ae'].acpi = '/mobius-yt/acp1';

        bodyString = JSON.stringify(results_ae);
    }

    http_request(conf.ae.id, parent, 'post', '2', bodyString, function (rsc, res_body) {
        callback(rsc, res_body);
    });
};

exports.rtvae = function (target, callback) {
    http_request(conf.ae.id, target, 'get', '', '', function (rsc, res_body) {
        callback(rsc, res_body);
    });
};


exports.udtae = function (target, callback) {
    var bodyString = '';
    var results_ae = {};
    if(conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ae['m2m:ae'] = {};
        results_ae['m2m:ae'].lbl = 'seahorse';
        bodyString = JSON.stringify(results_ae);
    }

    http_request(conf.ae.id, target, 'put', '', bodyString, function (rsc, res_body) {
        callback(rsc, res_body);
    });
};


exports.delae = function (target, callback) {
    http_request('Superman', target, 'delete', '', '', function (rsc, res_body) {
        callback(rsc, res_body);
    });
};

exports.del_resource = function (target, callback) {
    http_request('Superman', target, 'delete', '', '', function (rsc, res_body) {
        callback(rsc, res_body);
    });
};


exports.crtct = function(parent, rn, count, callback) {
    var results_ct = {};

    //console.log(count + ' - ' + conf.cnt[count].name);
    var bodyString = '';
    if (conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ct['m2m:cnt'] = {};
        results_ct['m2m:cnt'].rn = rn;
        results_ct['m2m:cnt'].lbl = [rn];
        bodyString = JSON.stringify(results_ct);
        console.log(bodyString);
    }

    http_request(conf.ae.id, parent, 'post', '3', bodyString, function (rsc, res_body) {
        console.log(count + ' - ' + parent + '/' + rn + ' - x-m2m-rsc : ' + rsc + ' <----');
        console.log(res_body);
        callback(rsc, res_body, count);
    });
};


exports.rtvct = function(target, count, callback) {
    http_request(conf.ae.id, target, 'get', '', '', function (rsc, res_body) {
//        console.log(count + ' - ' + target + ' - x-m2m-rsc : ' + rsc + ' <----');
//        console.log(res_body);
        callback(rsc, res_body, count);
    });
};


exports.udtct = function(target, lbl, count, callback) {
    var results_ct = {};
    var bodyString = '';
    if(conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ct['m2m:cnt'] = {};
        results_ct['m2m:cnt'].lbl = lbl;
        bodyString = JSON.stringify(results_ct);
    }

    http_request(conf.ae.id, target, 'put', '', bodyString, function (rsc, res_body) {
        console.log(count + ' - ' + target + ' - x-m2m-rsc : ' + rsc + ' <----');
        callback(rsc, res_body, count);
    });
};


exports.delct = function(target, count, callback) {
    http_request('Superman', target, 'delete', '', '', function (rsc, res_body) {
        console.log(count + ' - ' + target + ' - x-m2m-rsc : ' + rsc + ' <----');
        callback(rsc, res_body, count);
    });
};

exports.crtsub = function(parent, rn, nu, count, callback) {
    var results_ss = {};
    var bodyString = '';
    if (conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ss['m2m:sub'] = {};
        results_ss['m2m:sub'].rn = rn;
        results_ss['m2m:sub'].enc = {net: [1,2,3,4]};
        results_ss['m2m:sub'].nu = [nu];
        results_ss['m2m:sub'].nct = 2;
        //results_ss['m2m:sub'].exc = 0;

        bodyString = JSON.stringify(results_ss);
        console.log(bodyString);
    }

    http_request(conf.ae.id, parent, 'post', '23', bodyString, function (rsc, res_body) {
        console.log(count + ' - ' + parent + '/' + rn + ' - x-m2m-rsc : ' + rsc + ' <----');
        console.log(JSON.stringify(res_body));
        callback(rsc, res_body, count);
    });
};

exports.delsub = function(target, count, callback) {
    http_request('Superman', target, 'delete', '', '', function (rsc, res_body) {
        console.log(count + ' - ' + target + ' - x-m2m-rsc : ' + rsc + ' <----');
        console.log(res_body);
        callback(rsc, res_body, count);
    });
};


exports.crtci = function(parent, count, content_obj, socket, callback) {
    var results_ci = {};
    var bodyString = '';
    if(conf.ae.bodytype === 'xml') {
    }
    else if(conf.ae.bodytype === 'cbor') {
    }
    else {
        results_ci['m2m:cin'] = {};
        results_ci['m2m:cin'].con = content_obj;

        bodyString = JSON.stringify(results_ci);

        //console.log(bodyString);
    }

    http_request(conf.ae.id, parent, 'post', '4', bodyString, function (rsc, res_body) {
        callback(rsc, res_body, parent, socket);
    });
};


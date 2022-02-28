var http = require('http');
var fs = require('fs');
var mqtt = require('mqtt');
var util = require('util');
var url = require('url');
var shortid = require('shortid');
const moment = require('moment');

global.sh_adn = require('./http_adn');
let gpsapp = require('./gcsapp');

global.my_control_type = '';
global.my_rc_name = '';
global.my_gcs_t_cnt_name = '';
global.my_cnt_nname = '';
global.my_parename = '';
global.pre_my_cnt_name = '';
global.my_sortie_name = 'disarm';

global.my_system_id = 1;
global.boot_start_time = moment().valueOf();
global.boot_time = 0;
const retry_interval = 2500;
const normal_interval = 100;

global.getType = function (p) {
    var type = 'string';
    if (Array.isArray(p)) {
        type = 'array';
    } else if (typeof p === 'string') {
        try {
            var _p = JSON.parse(p);
            if (typeof _p === 'object') {
                type = 'string_object';
            } else {
                type = 'string';
            }
        } catch (e) {
            type = 'string';
            return type;
        }
    } else if (p != null && typeof p === 'object') {
        type = 'object';
    } else {
        type = 'other';
    }

    return type;
};


var return_count = 0;
var request_count = 0;


function ae_response_action(status, res_body, callback) {
    var aeid = res_body['m2m:ae']['aei'];
    conf.ae.id = aeid;
    callback(status, aeid);
}

function create_cnt_all(count, callback) {
    if (conf.cnt.length == 0) {
        callback(2001, count);
    } else {
        if (conf.cnt.hasOwnProperty(count)) {
            var parent = conf.cnt[count].parent;
            var rn = conf.cnt[count].name;
            sh_adn.crtct(parent, rn, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2001 || rsc == 4105) {
                    create_cnt_all(++count, function (status, count) {
                        callback(status, count);
                    });
                } else {
                    callback(9999, count);
                }
            });
        } else {
            callback(2001, count);
        }
    }
}

function delete_sub_all(count, callback) {
    if (conf.sub.length == 0) {
        callback(2001, count);
    } else {
        if (conf.sub.hasOwnProperty(count)) {
            var target = conf.sub[count].parent + '/' + conf.sub[count].name;
            sh_adn.delsub(target, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2002 || rsc == 2000 || rsc == 4105 || rsc == 4004) {
                    delete_sub_all(++count, function (status, count) {
                        callback(status, count);
                    });
                } else {
                    callback(9999, count);
                }
            });
        } else {
            callback(2001, count);
        }
    }
}

function create_sub_all(count, callback) {
    if (conf.sub.length == 0) {
        callback(2001, count);
    } else {
        if (conf.sub.hasOwnProperty(count)) {
            var parent = conf.sub[count].parent;
            var rn = conf.sub[count].name;
            var nu = conf.sub[count].nu;
            sh_adn.crtsub(parent, rn, nu, count, function (rsc, res_body, count) {
                if (rsc == 5106 || rsc == 2001 || rsc == 4105) {
                    create_sub_all(++count, function (status, count) {
                        callback(status, count);
                    });
                } else {
                    callback('9999', count);
                }
            });
        } else {
            callback(2001, count);
        }
    }
}

global.drone_info = {};
global.mission_parent = [];

function retrieve_my_cnt_name(callback) {
    sh_adn.rtvct('/Mobius/' + conf.ae.approval_gcs + '/gcs_approval/' + conf.ae.name + '/la', 0, function (rsc, res_body, count) {
        if (rsc == 2000) {
            drone_info = res_body[Object.keys(res_body)[0]].con;
            console.log(drone_info);

            conf.cnt = [];
            conf.fc = [];

            if (drone_info.hasOwnProperty('gcs')) {
                my_gcs_name = drone_info.gcs;
            } else {
                my_gcs_name = 'KETI_MUV';
            }

            if (drone_info.hasOwnProperty('host')) {
                conf.cse.host = drone_info.host;
            } else {
            }

            console.log("gcs host is " + conf.cse.host);

            var info = {};
            info.parent = '/Mobius/' + drone_info.gcs;
            info.name = 'Drone_Data';
            conf.cnt.push(JSON.parse(JSON.stringify(info)));

            info = {};
            info.parent = '/Mobius/' + drone_info.gcs + '/Drone_Data';
            info.name = drone_info.drone;
            conf.cnt.push(JSON.parse(JSON.stringify(info)));

            info.parent = '/Mobius/' + drone_info.gcs + '/Drone_Data/' + drone_info.drone;
            info.name = my_sortie_name;
            conf.cnt.push(JSON.parse(JSON.stringify(info)));

            my_parent_cnt_name = info.parent;
            my_cnt_name = my_parent_cnt_name + '/' + info.name;

            if (drone_info.hasOwnProperty('system_id')) {
                my_system_id = drone_info.system_id;
            } else {
                my_system_id = 1;
            }


            sh_state = 'crtae';
            setTimeout(http_watchdog, normal_interval);
            callback();
        } else {
            console.log('x-m2m-rsc : ' + rsc + ' <----' + res_body);
            setTimeout(http_watchdog, retry_interval);
            callback();
        }
    });
}

function http_watchdog() {
    if (sh_state === 'rtvct') {
        retrieve_my_cnt_name(function () {

        });
    } else if (sh_state === 'crtae') {
        console.log('[sh_state] : ' + sh_state);
        sh_adn.crtae(conf.ae.parent, conf.ae.name, conf.ae.appid, function (status, res_body) {
            console.log(res_body);
            if (status == 2001) {
                ae_response_action(status, res_body, function (status, aeid) {
                    console.log('x-m2m-rsc : ' + status + ' - ' + aeid + ' <----');
                    sh_state = 'rtvae';
                    request_count = 0;
                    return_count = 0;

                    setTimeout(http_watchdog, normal_interval);
                });
            } else if (status == 5106 || status == 4105) {
                console.log('x-m2m-rsc : ' + status + ' <----');
                sh_state = 'rtvae';

                setTimeout(http_watchdog, normal_interval);
            } else {
                console.log('x-m2m-rsc : ' + status + ' <----');
                setTimeout(http_watchdog, retry_interval);
            }
        });
    } else if (sh_state === 'rtvae') {
        if (conf.ae.id === 'S') {
            conf.ae.id = 'S' + shortid.generate();
        }

        console.log('[sh_state] : ' + sh_state);
        sh_adn.rtvae(conf.ae.parent + '/' + conf.ae.name, function (status, res_body) {
            if (status == 2000) {
                var aeid = res_body['m2m:ae']['aei'];
                console.log('x-m2m-rsc : ' + status + ' - ' + aeid + ' <----');

                if (conf.ae.id != aeid && conf.ae.id != ('/' + aeid)) {
                    console.log('AE-ID created is ' + aeid + ' not equal to device AE-ID is ' + conf.ae.id);
                } else {
                    sh_state = 'crtct';
                    request_count = 0;
                    return_count = 0;

                    setTimeout(http_watchdog, normal_interval);
                }
            } else {
                console.log('x-m2m-rsc : ' + status + ' <----');
                setTimeout(http_watchdog, retry_interval);
            }
        });
    } else if (sh_state === 'crtct') {
        console.log('[sh_state] : ' + sh_state);
        create_cnt_all(request_count, function (status, count) {
            if (status == 9999) {
                setTimeout(http_watchdog, retry_interval);
            } else {
                request_count = ++count;
                return_count = 0;
                if (conf.cnt.length <= count) {
                    sh_state = 'crtci';

                    request_count = 0;
                    return_count = 0;

                    mqtt_connect(conf.cse.host, conf.cse.mqttport)
                    gpsapp.ready();

                    setTimeout(http_watchdog, normal_interval);
                }
            }
        });
    } else if (sh_state === 'crtci') {
        //setTimeout(check_rtv_cnt, 10000);
    }
}

setTimeout(http_watchdog, normal_interval);

function mqtt_connect(broker_ip, port) {
    if (mqtt_client == null) {
        var connectOptions = {
            host: broker_ip,
            port: port,
            protocol: "mqtt",
            keepalive: 10,
            // clientId: serverUID,
            protocolId: "MQTT",
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 2000,
            rejectUnauthorized: false
        };


        mqtt_client = mqtt.connect(connectOptions);

        mqtt_client.on('connect', function () {
            console.log('mqtt connected to ' + broker_ip);
        });

        mqtt_client.on('error', function (err) {
            console.log('[mqtt_client error] ' + err.message);
        });
    }
}

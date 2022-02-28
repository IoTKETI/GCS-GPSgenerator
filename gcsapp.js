const SerialPort = require("serialport");
const SerialPortParser = require("@serialport/parser-readline");
const GPS = require("gps");
const Request = require("request-promise");
const mavlink = require('./mavlink.js');
const moment = require('moment');

let gpsPort = null;
let gpsPortNum = 'COM15';
let gpsBaudrate = '115200';

let gps = null;
let parser = null;

let globalpositionint_msg = '';
let gpsrawint_msg = '';
let heartbeat_msg = '';


exports.ready = function gps_ready() {
    gpsPortNum = 'COM16';
    gpsBaudrate = '9600';
    gpsPortOpening();
}

function gpsPortOpening() {
    if (gpsPort == null) {
        gpsPort = new SerialPort(gpsPortNum, {
            baudRate: parseInt(gpsBaudrate, 10),
        });

        gpsPort.on('open', gpsPortOpen);
        gpsPort.on('close', gpsPortClose);
        gpsPort.on('error', gpsPortError);
        gpsPort.on('data', gpsPortData);
    } else {
        if (gpsPort.isOpen) {

        } else {
            gpsPort.open();
        }
    }
}

function gpsPortOpen() {
    gps = new GPS();

    parser = gpsPort.pipe(new SerialPortParser());

    console.log('gpsPort open. ' + gpsPortNum + ' Data rate: ' + gpsBaudrate);
}

function gpsPortClose() {
    console.log('gpsPort closed.');

    setTimeout(gpsPortOpening, 2000);
}

function gpsPortError(error) {
    var error_str = error.toString();
    console.log('[gpsPort error]: ' + error.message);
    if (error_str.substring(0, 14) == "Error: Opening") {

    } else {
        console.log('gpsPort error : ' + error);
    }

    setTimeout(gpsPortOpening, 2000);
}

function gpsPortData(data) {
    parser.on("data", data => {
        gps.update(data);
    });

    console.log(data);
    if (data.type == 'GGA') {
        if (data.quality != null) {
            // console.log(data.lat,",", data.lon);
            setTimeout(createMAVLinkData, 1, my_system_id, boot_time, data);
        }
        else {
            data.lat = 0;
            data.lon = 0;
            data.alt = 0;
            data.hdop = 0;
            setTimeout(createMAVLinkData, 1, my_system_id, boot_time, data);
        }
    }
}

// parser.on("data", data => {
//     gps.update(data);
// });

setInterval(function () {
    boot_time = moment().valueOf() - boot_start_time;
}, 1);

setInterval(sendMQTTData, 500);

function createMAVLinkData(sys_id, boot_time, data) {
    let params = {}
    params.target_system = sys_id;
    params.target_component = 1;
    params.time_boot_ms = boot_time;
    params.lat = parseFloat(data.lat) * 1E7;
    params.lon = parseFloat(data.lon) * 1E7;
    params.alt = parseFloat(data.alt) * 1000;
    params.relative_alt = 0;
    params.vx = 0;
    params.vy = 0;
    params.vz = 0;
    params.hdg = 0;

    try {
        globalpositionint_msg = mavlinkGenerateMessage(params.target_system, params.target_component, mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT, params);
        if (globalpositionint_msg == null) {
            console.log("mavlink message(MAVLINK_MSG_ID_GLOBAL_POSITION_INT) is null");
        } else {
            // console.log(globalpositionint_msg)
        }
    } catch (ex) {
        console.log('[ERROR] ' + ex);
    }
    send_aggr_to_Mobius(my_cnt_name, globalpositionint_msg.toString('hex'), 1000);

    params = {}
    params.target_system = sys_id;
    params.target_component = 1;
    params.time_usec = boot_time;
    params.fix_type = 3;
    params.lat = parseFloat(data.lat) * 1E7;
    params.lon = parseFloat(data.lon) * 1E7;
    params.alt = parseFloat(data.alt) * 1000;
    params.eph = parseFloat(data.hdop) * 100;
    params.epv = 0;
    params.vel = 0;
    params.cog = 0;
    params.satellites_visible = data.satellites;

    try {
        gpsrawint_msg = mavlinkGenerateMessage(params.target_system, params.target_component, mavlink.MAVLINK_MSG_ID_GPS_RAW_INT, params);
        if (gpsrawint_msg == null) {
            console.log("mavlink message(MAVLINK_MSG_ID_GPS_RAW_INT) is null");
        } else {
            // console.log(gpsrawint_msg)
        }
    } catch (ex) {
        console.log('[ERROR] ' + ex);
    }
    send_aggr_to_Mobius(my_cnt_name, gpsrawint_msg.toString('hex'), 1000);

    // params = {}
    // params.target_system = sys_id;
    // params.target_component = 1;
    // params.time_usec = boot_time;
    // params.seq = 0;
    // params.target_system = 0;
    // params.target_component = 0;

    // try {
    //     let msg = mavlinkGenerateMessage(params.target_system, params.target_component, mavlink.MAVLINK_MSG_ID_PING, params);
    //     if (msg == null) {
    //       console.log("mavlink message(MAVLINK_MSG_ID_PING) is null");
    //     } else {
    //         console.log(msg)
    //            mqtt_client.publish(my_cnt_name, Buffer.from(msg, 'hex'));
    //     }
    // } catch (ex) {
    //     console.log('[ERROR] ' + ex);
    // }

    params = {}
    params.target_system = sys_id;
    params.target_component = 1;
    params.type = sys_id;
    params.autopilot = 8; // MAV_AUTOPILOT_INVALID
    params.base_mode = 0x20;
    params.custom_mode = 0;
    params.system_status = 3;
    params.mavlink_version = 1;

    try {
        heartbeat_msg = mavlinkGenerateMessage(params.target_system, params.target_component, mavlink.MAVLINK_MSG_ID_HEARTBEAT, params);
        if (heartbeat_msg == null) {
            console.log("mavlink message(MAVLINK_MSG_ID_HEARTBEAT) is null");
        } else {
            // console.log(heartbeat_msg)
        }
    } catch (ex) {
        console.log('[ERROR] ' + ex);
    }
    send_aggr_to_Mobius(my_cnt_name, heartbeat_msg.toString('hex'), 1000);
}

function mavlinkGenerateMessage(src_sys_id, src_comp_id, type, params) {
    const mavlinkParser = new MAVLink(null/*logger*/, src_sys_id, src_comp_id);
    try {
        var mavMsg = null;
        var genMsg = null;

        switch (type) {
            case mavlink.MAVLINK_MSG_ID_HEARTBEAT:
                mavMsg = new mavlink.messages.heartbeat(params.type,
                    params.autopilot,
                    params.base_mode,
                    params.custom_mode,
                    params.system_status,
                    params.mavlink_version);
                break;
            case mavlink.MAVLINK_MSG_ID_GLOBAL_POSITION_INT:
                mavMsg = new mavlink.messages.global_position_int(params.time_boot_ms,
                    params.lat,
                    params.lon,
                    params.alt,
                    params.relative_alt,
                    params.vx,
                    params.vy,
                    params.vz,
                    params.hdg);
                break;
            case mavlink.MAVLINK_MSG_ID_GPS_RAW_INT:
                mavMsg = new mavlink.messages.gps_raw_int(params.time_usec,
                    params.fix_type,
                    params.lat,
                    params.lon,
                    params.alt,
                    params.eph,
                    params.epv,
                    params.vel,
                    params.cog,
                    params.satellites_visible,
                    params.alt_ellipsoid,
                    params.h_acc,
                    params.v_acc,
                    params.vel_acc,
                    params.hdg_acc);
                break;
        }
    } catch (e) {
        console.log('MAVLINK EX:' + e);
    }

    if (mavMsg) {
        genMsg = Buffer.from(mavMsg.pack(mavlinkParser));
        //console.log('>>>>> MAVLINK OUTGOING MSG: ' + genMsg.toString('hex'));
    }

    return genMsg;
}


function sendMQTTData() {
    if (heartbeat_msg !== '') {
        mqtt_client.publish(my_cnt_name, Buffer.from(heartbeat_msg, 'hex'));
    }

    if (globalpositionint_msg !== '') {
        mqtt_client.publish(my_cnt_name, Buffer.from(globalpositionint_msg, 'hex'));
    }

    if (gpsrawint_msg !== '') {
        mqtt_client.publish(my_cnt_name, Buffer.from(gpsrawint_msg, 'hex'));
    }
}

var aggr_content = {};

function send_aggr_to_Mobius(topic, content_each, gap) {
    if (aggr_content.hasOwnProperty(topic)) {
        var timestamp = moment().format('YYYY-MM-DDTHH:mm:ssSSS');
        aggr_content[topic][timestamp] = content_each;
    } else {
        aggr_content[topic] = {};
        timestamp = moment().format('YYYY-MM-DDTHH:mm:ssSSS');
        aggr_content[topic][timestamp] = content_each;

        setTimeout(function () {
            sh_adn.crtci(topic + '?rcn=0', 0, aggr_content[topic], null, function () {

            });

            delete aggr_content[topic];
        }, gap, topic);
    }
}

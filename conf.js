const fs = require('fs');

let conf = {};
let cse = {};
let ae = {};

conf.useprotocol = 'http'; // select one for 'http' or 'mqtt' or 'coap' or 'ws'

// build cse

let approval_host = {}
approval_host.ip = 'gcs.iotocean.org';  // '203.253.128.177';

cse.host        = approval_host.ip;
cse.port        = '7579';
cse.name        = 'Mobius';
cse.id          = '/Mobius2';
cse.mqttport    = '1883';
cse.wsport      = '7577';

// build ae
let drone_info = {};
try {
    drone_info = JSON.parse(fs.readFileSync('../drone_info.json', 'utf8'));
}
catch (e) {
    console.log('can not find [ ../drone_info.json ] file');
    drone_info.id = "Dione";
    drone_info.approval_gcs = "MUV";
    drone_info.host = "gcs.iotocean.org";
    drone_info.drone = "Drone1";
    drone_info.gcs = "KETI_GCS";
    drone_info.type = "ardupilot";
    drone_info.system_id = 1;
    drone_info.gcs_ip = "192.168.1.150";
}

ae.approval_gcs          = drone_info.approval_gcs;
ae.name         = drone_info.id;

ae.id           = 'S'+ae.name;

ae.parent       = '/' + cse.name;
ae.appid        = require('shortid').generate();
ae.port         = '9727';
ae.bodytype     = 'json'; // select 'json' or 'xml' or 'cbor'

conf.cse = cse;
conf.ae = ae;

module.exports = conf;

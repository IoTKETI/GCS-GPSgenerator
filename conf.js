var fs = require('fs');

var conf = {};
var cse = {};
var ae = {};

conf.useprotocol = 'http'; // select one for 'http' or 'mqtt' or 'coap' or 'ws'

// build cse

var approval_host = {}
approval_host.ip = '203.253.128.177';

cse.host        = approval_host.ip;
cse.port        = '7579';
cse.name        = 'Mobius';
cse.id          = '/Mobius2';
cse.mqttport    = '1883';
cse.wsport      = '7577';

// build ae
var ae_name = {};
try {
    ae_name = JSON.parse(fs.readFileSync('gcsInfo.json', 'utf8'));
}
catch (e) {
    console.log('can not find gcsInfo.json file');
    ae_name.approval_gcs = 'MUV';
    ae_name.flight = 'Dione';
    fs.writeFileSync('gcsInfo.json', JSON.stringify(ae_name, null, 4), 'utf8');
}

ae.approval_gcs          = ae_name.approval_gcs;
ae.name         = ae_name.flight;

ae.id           = 'S'+ae.name;

ae.parent       = '/' + cse.name;
ae.appid        = require('shortid').generate();
ae.port         = '9727';
ae.bodytype     = 'json'; // select 'json' or 'xml' or 'cbor'

conf.cse = cse;
conf.ae = ae;

module.exports = conf;
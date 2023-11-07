// smbClient.js
const SMB2 = require('smb2');

const smb2Client = new SMB2({
  share: '\\\\localhost\\arquivos',
  domain: '',
  username: 'john',
  password: 'smith',
  port: 10010,
});

function listSMBFiles(callback) {
  smb2Client.readdir('', (err, files) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, files);
    }
  });
}

const express = require("express");
const SMB2 = require('@marsaud/smb2');
const app = express();
const util = require('util');

//localhost:8080/arquivos/?path=/john/teste/ -> localhost:8080/arquivos/?path=DIOSAJDIOSAJIOJ3NDCAIOUY(BASE64). Enviar param ?path= e codificar e decodificar em base 64
function listSMBFiles(path) { 
  
  const smb2Client = new SMB2({ //necessario declarar toda vez q acessar pois cada mudança nos arquivos é preciso gerar um novo smb2Client, senão a aplicação crasha
    share: '\\\\localhost\\arquivos',
    domain: '',
    username: 'john',
    password: 'smith',
    port: 10010,
  });

  return new Promise((resolve, reject) => {
    smb2Client.readdir(`${path}`, {stats: true}, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  }).finally(()=>{
    smb2Client.disconnect();
  });;

}


app.get("/arquivos", async (request, response) => {
  const path = request.query.filePath;
  const arqs = await listSMBFiles(path);
  arqs.forEach((file) => {
    console.log(file.isDirectory);
    file.isDir = file.isDirectory();
    if (file.isDirectory()) {
      console.log(`${file.name} is a folder`);
    } else {
      console.log(`${file.name} is a file`);
    }
  });
  
  try {
    console.log(arqs)
    response.send(arqs);
  } catch (error) {
    response.status(500).send(error);
  }
});


module.exports = app;
const express = require("express");
const SMB2 = require('@marsaud/smb2');
const app = express();
const util = require('util');
const fs = require('fs');
const detectFileType = require("../services/file.js");


const newSMBClient = function(username, password){
  return new SMB2({ //necessario declarar toda vez q acessar pois cada mudança nos arquivos é preciso gerar um novo smb2Client, senão a aplicação crasha
    share: '\\\\localhost\\arquivos',
    domain: '',
    username: `${username}`,
    password: `${password}`,
    autoCloseTimeout: 0,
    port: 10010,
  });  

}
//localhost:8080/arquivos/?path=/john/teste/ -> localhost:8080/arquivos/?path=DIOSAJDIOSAJIOJ3NDCAIOUY(BASE64). Enviar param ?path= e codificar e decodificar em base 64
function listSMBFiles(path) { 

  const smb2Client = newSMBClient('john', 'smith');
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

function readSMBFile(path, fileName, encoding){
  const smb2Client = newSMBClient('john', 'smith');
  console.log('readSMBFile');
  //console.log(getFileType);
  return new Promise((resolve, reject) => {
    smb2Client.readFile(`${path}/${fileName}`, function(err, data) {
      if (err){
        reject(err);
      }else{
        resolve(JSON.stringify(data))
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
    file.ext = detectFileType(file.name);
  
    if(file.ext == 'txt'){
      file.type = 'text';
    }else if(file.ext == 'jpeg' || file.ext == 'jpg' || file.ext == 'png'){
      file.type = 'image';
    }else if(file.ext =='mp4'){
      file.type = 'video';
    }

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



app.get("/arquivos/:name", async (request, response) => {
  const path = request.query.filePath;
  const fileName = request.params.name;
  
  var f = await readSMBFile(path, fileName); // f nao é constante pois precisamos tratar algumas coisas antes de retornar
  console.log('f: ' + f);
  f = JSON.parse(f)
  f.ext = detectFileType(fileName);
  
  if( f.ext == 'txt'){
    f.type = 'text';
    f.data = String.fromCharCode.apply(String, f.data);
  }else if( f.ext == 'jpeg' ||  f.ext == 'jpg' ||  f.ext == 'png'){
    f.type = 'image';
    f.data = Buffer.from(f.data).toString('base64');
  }else if( f.ext =='mp4'){
    f.type = 'video';
    f.data = Buffer.from(f.data).toString('base64');
  }

  /*
      if(file.ext == 'txt'){
      file.type = 'text';
    }else if(file.ext == 'jpeg' || file.ext == 'jpg' || file.ext == 'png'){
      file.type = 'image';
    }else if(file.ext =='mp4'){
      file.type = 'video';
    }*/
  try {
    response.send(f);
  } catch (error) {
    response.status(500).send(error);
  }

});

  app.get('/video', async (req, res) => {
    try {
      const smbClient = newSMBClient('john', 'smith');
      const fp = req.query.filePath;
      const type = req.query.type;
      const ext = req.query.ext;

      console.log('fp: '+ fp);
      console.log('type: '+ type);
      console.log('ext: '+ ext);

      const filePath = fp; // Replace with your video path
      
      const stats = await smbClient.stat(filePath);
      const fileSize = stats.size;
      var range = req.headers.range;
      if(!range){
        range = 'bytes=0-'
      }
      //if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
  
        //const file =smbClient.createReadStream(filePath, { start, end });

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': `${type}/${ext}`,
        };
        res.writeHead(206, head);

        smbClient.createReadStream(filePath, function(err, readStream){          
          if(err){
            throw err;
          }
          readStream.pipe(res);
          readStream.on('end', () => {
            // Stream has ended, close the response
            smbClient.disconnect();
            res.end();
          });
        });
    } catch (err) {
      console.error(err);
      //res.status(500).send('Internal Server Error');
    }
    
  });


module.exports = app;
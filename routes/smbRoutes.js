const express = require("express");
const SMB2 = require('@marsaud/smb2');
const app = express();
const util = require('util');
const fs = require('fs');
const detectFileType = require("../services/file.js");
const multer = require('multer');
//const upload = multer({ dest: 'uploads/' }); // Destination directory for uploaded files

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Destination folder for uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });
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
  });

  try {
    response.send(arqs);
  } catch (error) {
    response.status(500).send(error);
  }
});



app.get("/arquivos/:name", async (request, response) => {
  const path = request.query.filePath;
  const fileName = request.params.name;
  
  var f = await readSMBFile(path, fileName); // f nao é constante pois precisamos tratar algumas coisas antes de retornar
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
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
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
    res.status(500).send('Internal Server Error');
  }
  
});

// POST endpoint to handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  // 'file' in upload.single('file') corresponds to the name attribute in the HTML form
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const smbClient = newSMBClient('john', 'smith');
  const fp = req.file;
  const fn = req.file.filename;
  const chunks = [];
  //const buf = Buffer.alloc();
  console.log('fp: ' + fp.path);
  console.log('fn: ' + fn);
  // Access file details using req.file
  //console.log('Uploaded file:', req.file);

  try{
    var readStream = fs.createReadStream(fp.path);
    readStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    readStream.on('end', () => {
      // Concatenate all chunks into a single buffer
      const buffer = Buffer.concat(chunks);
    
      // Use the buffer as needed
      smbClient.writeFile('john/'+fp.filename, buffer, {mode: 0o777}, function(err) {
        if (err) throw err;
          res.status(200).json({ message: 'File Uploaded'});
      });
    });
    /*
    smbClient.createWriteStream('john/heyhey', {flags: 'w'}, function(err, writeStream) {
      if (err) throw err;
      var readStream = fs.createReadStream('routes/localFile');
      readStream.pipe(writeStream);
      readStream.on('error', ()=>{
        console.log('readStreamError');
      })
      readStream.on('end', ()=>{
        writeStream.end();
        //writeStream.close();
        console.log('readStreamEnd');
      });
      writeStream.on('end', ()=>{
        console.log('writeStreamEnd');
        
      });
      writeStream.on('finish', ()=>{
        console.log('writeStreamFinish');
        writeStream.end();
        res.status(200).send('File uploaded successfully.');
      });

      writeStream.on('error', (error)=>{
        console.log('writeStreamErrror');
        console.log(error);
      });

      writeStream.on('end', ()=>{
        console.log('writeStreamEnd');
      });
      */
  }catch(error){
    console.log(error);
    //res.status(500).json({ error: 'Error'});
  }
  // You can perform additional operations here, such as moving the file, processing it, etc.

});
module.exports = app;

/*
    smbClient.createWriteStream('john/'+fn, function(err, writeStream) {
      if (err) throw err;
      var readStream = fs.createReadStream(fp.path);
      console.log('readStream');
      console.log(readStream);
      writeStream.pipe(readStream);
      writeStream.on('end', () => {
        // Stream has ended, close the response
        
        //writeStream.unlinkSync(fp)
        smbClient.disconnect();
        res.status(200).json({ message: 'File uploaded to SMB'});
      });
    });

*/
//arquivos retornados do samba possuem um prefixo de 3 bytes, ja todo arquivo possui uma assinatura em bytes indicando seu tipo

function detectFileType(name){
  const i = name.lastIndexOf('.');
  if(i>-1){
    return name.substring(i+1, name.length);
  }else{
    return 'unkown';
  }
}
/*
function detectFileType__(minPrefixSize, maxSignatureSize, fileBytes) {
    const signature = fileBytes.slice(minPrefixSize, maxSignatureSize); // Grab the first few bytes
    // File signatures (magic numbers) for common file types
    console.log("detectFileType")
    const fileTypes = {
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      pdf: [0x25, 0x50, 0x44, 0x46],
      mp3: [0x49, 0x44, 0x33],
      mp4: [0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D], // MP4 file signature
      docx: [0x50, 0x4B, 0x03, 0x04], // DOCX file signature
    };
  
    // Compare the file signature with known file signatures
    for (const fileType in fileTypes) {
      const signatureBytes = fileTypes[fileType];
      console.log("hey: " + signatureBytes)
      console.log("hey2: " + signature[0]);
      if(signatureBytes.every((val, index) => val === signature[index])){
        console.log("val: " + val + " - signature[index]: " + signature[index]);
        return fileType;
      }
      
      if (signature.every((val, index) => val === signatureBytes[index])) {
        return fileType;
      }
      
    }
  
    // Check if it's a text file (using a simple text detection heuristic)
    const isTextFile = fileBytes.every(byte => byte >= 32 && byte <= 126);
    if (isTextFile) {
      return 'txt';
    }
  
    return 'Unknown'; // If no match is found
  }*/

module.exports = detectFileType;
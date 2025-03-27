const fs = require('fs');
const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // Save this securely!
const iv = crypto.randomBytes(16);  // Save this too!

const input = fs.createReadStream('goku.png');
const output = fs.createWriteStream('goku.enc');

const cipher = crypto.createCipheriv(algorithm, key, iv);
console.log(key.toString('hex'));
console.log(iv.toString('hex'));
input.pipe(cipher).pipe(output);
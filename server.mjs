import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root = new URL('./dist/', import.meta.url);
http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname; if(!['/','/index.html','/styles.css','/app.js'].includes(path)){res.writeHead(404);res.end();return;}const file=path==='/'?'index.html':path.slice(1);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(fileURLToPath(new URL(file,root))));}catch{res.writeHead(500);res.end('Unable to load StudyFlow');}}).listen(5173,'127.0.0.1',()=>console.log('StudyFlow: http://127.0.0.1:5173'));

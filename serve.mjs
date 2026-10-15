import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handle} from './api/index.mjs';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.gif':'image/gif','.mp4':'video/mp4','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://'+req.headers.host);
  if(url.pathname==='/'){res.writeHead(302,{Location:'/mirror/index.html'}).end();return;}
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!url.pathname.startsWith('/api/')){try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');const bytes=await readFile(file);if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(req.method==='HEAD'?undefined:bytes);return;}catch{}}
  let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000){res.writeHead(413).end();return;}}
  const response=await handle(new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body}:{})}));
  res.writeHead(response.status,Object.fromEntries(response.headers)).end(await response.text());
 }catch{res.writeHead(500,{'Content-Type':'text/plain'}).end('Unable to complete request.');}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Chatbot: http://localhost:'+(process.env.PORT||3000)));

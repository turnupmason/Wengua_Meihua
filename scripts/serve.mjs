import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.WENGUA_PORT||4173);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');const p=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/web/index.html':url.pathname));
    if(!p.startsWith(root+sep)||p.split(sep).some(x=>x.startsWith('.'))){res.writeHead(403);res.end();return;}
    if(!(await stat(p)).isFile()){res.writeHead(404);res.end();return;}
    const bytes=await readFile(p);res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Wengua reference demo: http://127.0.0.1:${port}`));

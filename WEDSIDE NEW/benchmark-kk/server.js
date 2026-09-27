// Server tĩnh tối giản cho Benchmark KK.
// Chạy: node server.js
// Sau đó mở: http://localhost:8080
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname;
const mime = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8"};
http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  if(p === "/") p="/index.html";
  const file=path.join(root,p);
  if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404);return res.end("404");}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
}).listen(8080,()=>console.log("Benchmark KK: http://localhost:8080"));

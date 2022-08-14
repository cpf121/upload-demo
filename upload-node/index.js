const Koa = require('koa');
const app = new Koa();
// 为了方便监听, 需要从koa中引入路由中间件
const Router = require('koa-router');
const router = Router()
const { mkdirsSync } = require('./utils');

const multer = require('koa-multer');
const path = require('path');
const fs = require('fs-extra');
const koaBody = require('koa-body');
const uploadPath = path.join(__dirname, 'uploads');
const uploadTempPath = path.join(uploadPath, 'temp');
const upload = multer({ dest: uploadTempPath });
app.use(koaBody());

// 上传分片
router.post('/api/upload/chunk',upload.single('file'), async(ctx, next) => {
  console.log('file upload...')
  // 根据文件hash创建文件夹，把默认上传的文件移动当前hash文件夹下。方便后续文件合并。
  const {
    filename,
    totalChunks,
    chunkNumber,
    chunkSize,
    chunkMd5
  } = ctx.req.body;

  const chunksPath = path.join(uploadPath, chunkMd5, '/');
  if(!fs.existsSync(chunksPath)) mkdirsSync(chunksPath);
  fs.renameSync(ctx.req.file.path, chunksPath + chunkMd5 + '-' + chunkNumber);
  ctx.status = 200;
  ctx.body = {
    data:true
  }
  //ctx.res.end('Success');
  await next();
})

router.get('/api/upload/checkFile',async(ctx, next) => {
  const {fileMd5,fileExt}=ctx.request.query
  const chunksPath = path.join(uploadPath, fileMd5, '/');
  if(!fs.existsSync(chunksPath)){
    ctx.body={
      code:200,
      data:false
    }
  }else{
    ctx.body={
      code:200,
      data:true,
      dataMap:{
        resourceKey:fileMd5
      }
    }
  }
  await next();
})

//合并文件
router.post('/api/upload/mergefile', async(ctx, next) => {
  const {    
    size, 
    filename, 
    chunks, 
    fileMd5
  } = ctx.request.body;
  // 根据hash值，获取分片文件。
  // 创建存储文件
  // 合并
  const chunksPath = path.join(uploadPath, fileMd5, '/');
  const filePath = path.join(uploadPath, filename);
  // 读取所有的chunks 文件名存放在数组中
  const chunksArr = fs.readdirSync(chunksPath);
  // 创建存储文件
  fs.writeFileSync(filePath, ''); 
  if(chunksArr.length !== chunks || chunksArr.length === 0) {
    ctx.status = 200;
    ctx.res.end('切片文件数量不符合');
    return;
  }
  for (let i = 1; i < chunks+1; i++) {
    // 追加写入到文件中
    fs.appendFileSync(filePath, fs.readFileSync(chunksPath + fileMd5 + '-' +i));
    // 删除本次使用的chunk    
    fs.unlinkSync(chunksPath + fileMd5 + '-' +i);
  }
  fs.rmdirSync(chunksPath);
  // 文件合并成功，可以把文件信息进行入库。
  ctx.status = 200;
  ctx.res.end('合并成功');
  await next();
})

router.get("/api/test", async(ctx, next) => {
  console.log('test...')
  ctx.body={
    code:0,
    msg:'success',
    data:{one:"sd",two:'dsaf'}
  }
  ctx.status=200;
  //ctx.res.end();
  await next();
})

// 设置路由中间件
app.use(router.routes())
app.listen(3000, ()=> {
  console.log('server listening at port 3000')
})
const Koa = require('koa');
const app = new Koa();
// 为了方便监听, 需要从koa中引入路由中间件
const Router = require('koa-router');
const router = Router()

const multer = require('koa-multer');
const path = require('path');
const fs = require('fs-extra');
const koaBody = require('koa-body');
const uploadPath = path.join(__dirname, 'uploads');
const uploadTempPath = path.join(uploadPath, 'temp');
const upload = multer({ dest: uploadTempPath });
app.use(koaBody());

// 定义路由
router.get('/api/test1', async(ctx, next) => {
  console.log('I am the router middleware => /api/test1')
  ctx.body = 'hello'
})

router.get('/api/testerror', async(ctx, next) => {
  throw new Error('I am error.')
})

// 设置路由中间件
app.use(router.routes())
app.listen(3000, ()=> {
  console.log('server listening at port 3000')
})
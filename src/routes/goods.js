const router = require('@koa/router')();
const Goods = require('../model/goods');
const { ObjectId } = require('mongodb');

// 主页的轮播图
router.get('/home/banner', async ctx => {
  const res = await Goods.find({ home_banner: true }).exec();
  const banners = res.map(item => {
    return {
      _id: item._id,
      name: item.name,
      path: item.banner_url[0].path // 拿第一张图
    }
  });
  ctx.body = { code: 200, data: banners, error_msg: '' };
});

// 主页的商品
router.get('/home/products', async ctx => {
  const res = await Goods.find({ home_display: true }).exec();
  ctx.body = { code: 200, data: res, error_msg: '' };
});

// 商品详情
router.get('/detail/:id', async ctx => {
  const { request: { params: { id } } } = ctx;
  const res = await Goods.findOne({ _id: ObjectId(id) }).exec();
  ctx.body = { code: 200, data: res, error_msg: '' };
});

module.exports = router.routes();

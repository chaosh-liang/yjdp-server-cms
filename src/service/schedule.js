const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const goodsModel = require('../model/goods');
const seriesModel = require('../model/series');

const PUBLIC_URL = 'yjdp_public';
const UPLOAD_URL = 'upload';
let fileDirectory = path.resolve(`D:\\${PUBLIC_URL}\\${UPLOAD_URL}`);

if (process.env.NODE_ENV === 'production') {
  fileDirectory = path.resolve(
    `/opt/material/server/${PUBLIC_URL}/${UPLOAD_URL}`
  );
}

// 清理没用的图片
const clearUselessPicture = async () => {
  const allGoods = await goodsModel.find();
  const allSeries = await seriesModel.find();
  const dbGoodsPicture = allGoods // 商品的图片
    .map((goods) => {
      const { icon_url, banner_url, desc_url } = goods;
      const [, icon_file_name] = icon_url.match(/upload\/(.+)/);
      const banner_file_name = banner_url
        .filter((url) => url) // 把为空的过滤掉
        .map((url) => url.match(/upload\/(.+)/)[1]) // 只要文件名
        .flat(); // 拉平
      const desc_file_name = desc_url
        .filter((url) => url)
        .map((url) => url.match(/upload\/(.+)/)[1])
        .flat();
      return [icon_file_name, ...banner_file_name, ...desc_file_name];
    })
    .flat();
  const dbSeriesPicture = allSeries // 系列的图片
    .map((series) => {
      const { icon_url } = series;
      const [, icon_file_name] = icon_url.match(/upload\/(.+)/);
      return icon_file_name;
    });
  const dbPictureSet = new Set([...dbGoodsPicture, ...dbSeriesPicture]);
  // console.log('dbPictureSet => ', dbPictureSet);
  fs.readdir(fileDirectory, (error, files) => {
    if (error) throw error;
    // console.log('files => ', files);
    const redundantFiles = files.filter((file) => !dbPictureSet.has(file)); // 多余的文件
    redundantFiles.forEach((file) => {
      fs.unlinkSync(path.join(fileDirectory, file), (error) => {
        if (error) console.log('删除文件失败：', file);
      });
    });
  });
};

// 检查回收站中的记录，若有超过30天（含）的，则物理删除
const physicallyDeleteGoods = async () => {
  const recycleGoods = await goodsModel.find({ deleted: 1 });
  if (recycleGoods.length) {
    const shallbeDeletedGoods = recycleGoods.filter((goods) => {
      const deletedDate = new Date(goods.update_time).getTime(); // ms
      const now = Date.now(); // ms
      const diff = now - deletedDate;
      const days = parseInt(diff / 1000 / 60 / 60 / 24, 10); // 天
      return days >= 30;
    });
    if (shallbeDeletedGoods.length) {
      const ids = shallbeDeletedGoods.map((goods) => goods._id.toString());
      try {
        // console.log('待删除的商品 => ', ids);
        goodsModel.deleteMany({ deleted: 1, _id: { $in: ids } }).exec();
      } catch (error) {
        console.log('physicallyDeleteGoods/delete error => ', error);
      }
    }
  }
};

// 定时任务1，日期和时间为： 每周一 02:10:10
const clearFilesSchedule = () => {
  const clearFilesJob = schedule.scheduleJob(
    { hour: 2, minute: 10, second: 10, dayOfWeek: 1 },
    () => {
      /* // FIXME: 调试用
      const nextCron = clearFilesJob.nextInvocation(); // 返回下次的调用对象，如果被取消了，则返回 null
      if (nextCron) {
        const {
          _date: { ts },
        } = nextCron;
        console.log('下次清理无用文件的日期和时间 => ', new Date(ts));
      } */
      clearUselessPicture();
    }
  );
};

// 定时任务2，日期和时间为： 每月初一 01:10:10
const physicallyDeleteGoodsSchedule = () => {
  const physicallyDeleteGoodsJob = schedule.scheduleJob(
    { hour: 1, minute: 10, second: 10, date: 1 },
    () => {
      /* // FIXME: 调试用
      const nextCron = physicallyDeleteGoodsJob.nextInvocation(); // 返回下次的调用对象，如果被取消了，则返回 null
      if (nextCron) {
        const {
          _date: { ts },
        } = nextCron;
        console.log('下次物理删除商品的日期和时间 => ', new Date(ts));
      } */
      physicallyDeleteGoods();
    }
  );
};

module.exports = { clearFilesSchedule, physicallyDeleteGoodsSchedule };

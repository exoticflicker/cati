// 每天从 cati-counter Worker 读数据，更新 count.html 的内嵌数据 + 首页封面兜底数字
// 容错：读失败就重试，重试仍失败则保留昨天的旧值（防止漂移把数据抹成 0）
const fs = require('fs');
const COUNTER = 'https://cati-counter.cati-counter.workers.dev';

const ITEMS = ["completed","black","golden","silver","cow","ragdoll","siamese","tabby","orange","vote-dogi","vote-xuanxue","vote-gufeng","vote-xiaomao"];

async function fetchAll(){
  for(let i=0;i<10;i++){
    try{
      const r = await fetch(COUNTER + '/all');
      const j = await r.json();
      if(j && j.completed && typeof j.completed.total === 'number' && j.completed.total > 0){
        return j;
      }
    }catch(e){}
    await new Promise(x=>setTimeout(x, 3000*(i+1)));
  }
  return null;
}

(async()=>{
  const fresh = await fetchAll();

  // 读昨天的旧数据
  let oldData = {};
  try{
    const html = fs.readFileSync('count.html', 'utf8');
    const m = html.match(/const DATA = (\{.*?\});/);
    if(m) oldData = JSON.parse(m[1]);
  }catch(e){}

  const data = {};
  for(const name of ITEMS){
    if(fresh && fresh[name]){
      data[name] = { total: fresh[name].total, daily: fresh[name].daily, up: fresh[name].up || "" };
    } else if(oldData[name]){
      data[name] = oldData[name];   // 漂移了，保留旧值
    } else {
      data[name] = { total: 0, daily: 0, up: "" };
    }
  }

  // 1) count.html：写入新数据
  const html = fs.readFileSync('count.html', 'utf8');
  const out = html.replace(/const DATA = \{.*?\};/, 'const DATA = ' + JSON.stringify(data) + ';');
  fs.writeFileSync('count.html', out);

  // 2) index.html：把首页封面兜底数字刷成最新
  const idx = fs.readFileSync('index.html', 'utf8');
  let out2 = idx;
  if(data.completed && data.completed.total > 0){
    out2 = out2.replace(/已测试人数：\d+/, '已测试人数：' + data.completed.total);
  }
  fs.writeFileSync('index.html', out2);

  fs.writeFileSync('count.json', JSON.stringify(data));
  console.log('updated, completed =', data.completed.total, ', 黑猫 =', data.black.total);
})();

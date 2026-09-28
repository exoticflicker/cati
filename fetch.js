// 每天用 apizero Key 查数据，更新 count.html 的内嵌数据
// 容错：查到 0 / 失败就重试，重试仍失败则保留昨天的旧值（防止漂移把数据抹成 0）
const fs = require('fs');
const API_KEY = process.env.API_KEY;
if (!API_KEY) { console.error('缺少 API_KEY 环境变量'); process.exit(1); }

const ITEMS = ["completed","black","golden","silver","cow","ragdoll","siamese","tabby","orange","vote-dogi","vote-xuanxue","vote-gufeng","vote-xiaomao"];

async function fetchOne(name){
  for(let i=0;i<3;i++){
    try{
      const r = await fetch(`https://v1.apizero.cn/api/visits-counter?site=exoticflicker-cati&name=${name}&mode=total&no_increment=1&format=json&api_key=${API_KEY}`);
      const j = await r.json();
      const d = j.data;
      if(d && d.record && typeof d.record.total === 'number' && d.record.total > 0){
        return { total: d.record.total, daily: d.record.daily, up: (d.record.updated_at||"").replace("T"," ").slice(5,16) };
      }
    }catch(e){}
    await new Promise(r=>setTimeout(r,1500));
  }
  return null;
}

(async()=>{
  // 读昨天的旧数据
  let oldData = {};
  try{
    const html = fs.readFileSync('count.html', 'utf8');
    const m = html.match(/const DATA = (\{.*?\});/);
    if(m) oldData = JSON.parse(m[1]);
  }catch(e){}

  const data = {};
  for(const name of ITEMS){
    const fresh = await fetchOne(name);
    if(fresh !== null){
      data[name] = fresh;
    } else if(oldData[name]){
      data[name] = oldData[name];   // 漂移了，保留旧值
    } else {
      data[name] = { total: 0, daily: 0, up: "" };
    }
  }
  const html = fs.readFileSync('count.html', 'utf8');
  const out = html.replace(/const DATA = \{.*?\};/, 'const DATA = ' + JSON.stringify(data) + ';');
  fs.writeFileSync('count.html', out);
  console.log('updated, completed =', data.completed.total, ', 黑猫 =', data.black.total);
})();

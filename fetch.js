// 每天用 apizero Key 查数据，更新 count.html 的内嵌数据
// Key 从环境变量 API_KEY 读（GitHub Actions 的 secrets），不硬编码
const fs = require('fs');
const API_KEY = process.env.API_KEY;
if (!API_KEY) { console.error('缺少 API_KEY 环境变量'); process.exit(1); }

const ITEMS = ["completed","black","golden","silver","cow","ragdoll","siamese","tabby","orange","vote-dogi","vote-xuanxue","vote-gufeng","vote-xiaomao"];

async function fetchOne(name){
  try{
    const r = await fetch(`https://v1.apizero.cn/api/visits-counter?site=exoticflicker-cati&name=${name}&mode=total&no_increment=1&format=json&api_key=${API_KEY}`);
    const j = await r.json();
    const d = j.data;
    if(d && d.record){
      return { total: d.record.total, daily: d.record.daily, up: (d.record.updated_at||"").replace("T"," ").slice(5,16) };
    }
    return { total: 0, daily: 0, up: "" };
  }catch(e){
    return { total: 0, daily: 0, up: "" };
  }
}

(async()=>{
  const data = {};
  for(const name of ITEMS){
    data[name] = await fetchOne(name);
  }
  const html = fs.readFileSync('count.html', 'utf8');
  const out = html.replace('__DATA__', JSON.stringify(data));
  fs.writeFileSync('count.html', out);
  console.log('updated count.html, completed =', data.completed.total);
})();

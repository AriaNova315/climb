// 从高德 POI 搜索 API 抓取北京攀岩馆，输出 gyms-temp.json
// 用多关键词覆盖各种命名风格，再用 keytag/type 过滤非攀岩结果
// 用法：node scripts/fetch-gyms-amap.js

const fs = require('fs')
const path = require('path')

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const KEY = envContent.match(/AMAP_KEY=(.+)/)[1].trim()

// 覆盖各种命名：含"攀岩"、含"抱石"、含"岩馆"、含"攀石"（青山攀石/星岩攀石）、英文
const KEYWORDS = ['攀岩', '抱石', '岩馆', '攀石', 'climbing', 'boulder']

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function searchPOI(keyword, page = 1) {
  const url = new URL('https://restapi.amap.com/v3/place/text')
  url.searchParams.set('key', KEY)
  url.searchParams.set('keywords', keyword)
  url.searchParams.set('city', '北京')
  url.searchParams.set('citylimit', 'true')
  url.searchParams.set('offset', '25')
  url.searchParams.set('page', String(page))
  url.searchParams.set('extensions', 'all')
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.status !== '1') throw new Error(`API 错误 [${keyword} p${page}]: ${data.info}`)
  return data
}

async function fetchAll(keyword) {
  const results = []
  let page = 1
  while (true) {
    await sleep(1200)
    const data = await searchPOI(keyword, page)
    const pois = data.pois || []
    results.push(...pois)
    const total = Number(data.count) || 0
    process.stdout.write(` p${page}:${pois.length}/${total}`)
    if (pois.length === 0 || results.length >= total || page >= 4) break
    page++
  }
  return results
}

// 排除明显室外/无关
const EXCLUDE = ['飞拉达', '露营', '协会', '神潭', '白河', '铁索', '野攀', '健身•', '普拉提', '暂停营业']
// 保留条件：name/keytag/type 至少一处含攀岩相关词
const INCLUDE = ['攀岩', '抱石', '岩馆', '岩壁', '攀石', 'climbing', 'boulder']

function isClimbingGym(poi) {
  if (EXCLUDE.some(kw => poi.name.includes(kw))) return false
  const text = [poi.name, poi.keytag, poi.type].filter(Boolean).join(' ').toLowerCase()
  return INCLUDE.some(kw => text.includes(kw.toLowerCase()))
}

async function main() {
  const seen = new Map() // poiId → poi

  for (const kw of KEYWORDS) {
    process.stdout.write(`\n[${kw}]`)
    const pois = await fetchAll(kw)
    let added = 0
    for (const poi of pois) {
      if (!seen.has(poi.id) && isClimbingGym(poi)) {
        seen.set(poi.id, poi)
        added++
      }
    }
    console.log(`  → 新增 ${added}，累计 ${seen.size}`)
  }

  console.log(`\n共找到 ${seen.size} 家室内攀岩场馆`)

  const gyms = [...seen.values()].map((poi, i) => {
    const [lngStr, latStr] = (poi.location || '').split(',')
    const district = (poi.adname || '')
      .replace('北京市', '').replace('北京', '').replace('区', '').trim()

    return {
      id: `temp_${String(i + 1).padStart(3, '0')}`,
      amapId: poi.id,
      name: poi.name,
      mapLabel: poi.name,
      type: '',
      district,
      status: 'open',
      coordinates: {
        lat: parseFloat(latStr) || 0,
        lng: parseFloat(lngStr) || 0,
        approx: false,
      },
      address: poi.address || '',
      phone: Array.isArray(poi.tel) ? poi.tel.join(', ') : (poi.tel || ''),
      businessHours: poi.biz_ext?.opentime2 || '',
      keytag: poi.keytag || '',
      price: { ticket: '', coaching: '' },
      grades: { boulder: '', lead: '' },
      routeSetDifficulty: '',
      audience: [],
    }
  }).sort((a, b) => a.district.localeCompare(b.district, 'zh'))

  const outPath = path.join(__dirname, '../data/gyms-temp.json')
  fs.writeFileSync(outPath, JSON.stringify({
    _meta: {
      source: '高德 POI API（多关键词搜索）',
      fetchedAt: new Date().toISOString().slice(0, 10),
      total: gyms.length,
      note: 'type/mapLabel/price/grades 需人工补充；与 gyms.json 对比后决定是否合并',
    },
    gyms,
  }, null, 2), 'utf8')

  console.log(`已写入 data/gyms-temp.json（${gyms.length} 家）`)
}

main().catch(console.error)

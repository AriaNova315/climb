// 合并 gyms.json（现有）与 gyms-temp.json（高德）
// 输出 data/gyms-merged.json + 控制台合并报告
// 用法：node scripts/merge-gyms.js

const fs = require('fs')
const path = require('path')
const { geoContains } = require('d3-geo')

const existingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gyms.json'), 'utf8'))
const tempData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gyms-temp.json'), 'utf8'))
const districts = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/beijing-districts.json'), 'utf8'))

const existing = existingData.gyms
const temp = tempData.gyms

// ── 工具函数 ──────────────────────────────────────────────

// 提取品牌核心名：去括号内容、去"攀岩/抱石/运动"等通用词、转小写
function normalize(name) {
  return name
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/攀岩馆?|抱石馆?|运动空间|攀登中心|共享空间|儿童|俱乐部|训练中心/g, '')
    .replace(/\s/g, '')
    .toLowerCase()
}

// 提取括号内的门店位置提示
function locationHint(name) {
  const m = name.match(/[（(]([^）)]+)[）)]/)
  return m ? m[1].replace(/店$|校区$|馆$/, '') : ''
}

// 两个 hint 是否相容
function hintsCompatible(h1, h2) {
  if (!h1) return true  // 现有无 hint，不排除任何 Amap 条目
  if (!h2) return false // 现有有 hint 但 Amap 无 hint，很可能不是同一门店
  const a = h1.replace(/[^一-龥a-z0-9]/gi, '').toLowerCase()
  const b = h2.replace(/[^一-龥a-z0-9]/gi, '').toLowerCase()
  return a.includes(b.slice(0, 3)) || b.includes(a.slice(0, 3))
}

// Haversine 距离（米）
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 通过坐标查区名
function lookupDistrict(lng, lat) {
  const f = districts.features.find(f => geoContains(f, [lng, lat]))
  return f ? f.properties.name.replace('区', '') : ''
}

// 是否含停业/装修标记
function suspendedStatus(name) {
  if (name.includes('暂停营业')) return 'suspended'
  if (name.includes('装修中')) return 'renovation'
  return null
}

// ── 匹配逻辑 ─────────────────────────────────────────────

const tempUsed = new Set()

// 对每条现有记录，在 temp 里找候选
function findCandidates(gym) {
  const normExist = normalize(gym.name)
  return temp.filter(t => {
    const normTemp = normalize(t.name)
    return normExist.length >= 2 && normTemp.length >= 2 &&
      (normTemp.includes(normExist) || normExist.includes(normTemp))
  })
}

const report = {
  autoMerged: [],      // 情况1：高置信自动合并
  needReview: [],      // 情况2：模糊匹配，需人工确认
  oneToMany: [],       // 情况3：现有一条，Amap 多条门店
  notInAmap: [],       // 情况4：现有有，Amap 没有
  newInAmap: [],       // 情况5：Amap 有，现有没有
  statusAlert: [],     // 情况6：营业状态异常
  coordConflict: [],   // 情况7：坐标偏差 > 500m
}

// 生成合并后的 gyms 数组（基于现有数据）
const mergedGyms = existing.map(gym => {
  const candidates = findCandidates(gym)

  // 情况4：Amap 没有
  if (candidates.length === 0) {
    report.notInAmap.push({ gym: gym.mapLabel || gym.name, district: gym.district })
    return { ...gym }
  }

  // 情况3：一对多
  if (candidates.length > 1) {
    // 优先从 mapLabel 提取位置 hint（mapLabel 含完整门店名如"香蕉（上地）"）
    const hint = locationHint(gym.mapLabel || gym.name)
    // 尝试用门店 hint 缩小到唯一
    const narrowed = candidates.filter(c => hintsCompatible(hint, locationHint(c.name)))
    if (narrowed.length !== 1) {
      report.oneToMany.push({
        existing: gym.name,
        candidates: candidates.map(c => c.name),
      })
      return { ...gym }
    }
    // 缩小到唯一，继续走下面的合并逻辑
    candidates.splice(0, candidates.length, ...narrowed)
  }

  const match = candidates[0]
  const hint1 = locationHint(gym.name)
  const hint2 = locationHint(match.name)
  const highConfidence = hintsCompatible(hint1, hint2)

  // 情况6：营业状态异常
  const ss = suspendedStatus(match.name)
  if (ss) {
    report.statusAlert.push({ existing: gym.name, amapName: match.name, status: ss })
  }

  // 情况2：低置信，待人工确认
  if (!highConfidence) {
    report.needReview.push({ existing: gym.name, amapName: match.name, hint1, hint2 })
    return { ...gym }
  }

  // 情况7：坐标偏差
  const dist = distanceM(
    gym.coordinates.lat, gym.coordinates.lng,
    match.coordinates.lat, match.coordinates.lng
  )
  if (dist > 500) {
    report.coordConflict.push({
      name: gym.name,
      existingCoord: `${gym.coordinates.lat},${gym.coordinates.lng}`,
      amapCoord: `${match.coordinates.lat},${match.coordinates.lng}`,
      distanceM: Math.round(dist),
    })
  }

  // 情况1：自动合并
  tempUsed.add(match.amapId)
  const updated = {
    ...gym,
    mapLabel: match.name,   // 用高德官方名称
    coordinates: {
      lat: match.coordinates.lat,
      lng: match.coordinates.lng,
      approx: false,
    },
    district: lookupDistrict(match.coordinates.lng, match.coordinates.lat) || gym.district,
    address: match.address || gym.address,
    phone: match.phone || gym.phone,
    businessHours: match.businessHours || gym.businessHours,
  }

  report.autoMerged.push({
    existing: gym.name,
    amapName: match.name,
    distanceM: Math.round(dist),
    filledFields: [
      match.address && !gym.address ? 'address' : '',
      match.phone && !gym.phone ? 'phone' : '',
      match.businessHours && !gym.businessHours ? 'businessHours' : '',
    ].filter(Boolean),
  })

  return updated
})

// 情况5：Amap 有，现有没有
temp.forEach(t => {
  if (!tempUsed.has(t.amapId) && !suspendedStatus(t.name)) {
    const ss = suspendedStatus(t.name)
    report.newInAmap.push({ name: t.name, district: t.district, address: t.address, status: ss || 'open' })
  }
})

// ── 打印报告 ──────────────────────────────────────────────

console.log('\n════════════════════════════════════════')
console.log('            合并报告')
console.log('════════════════════════════════════════')

console.log(`\n【情况1】自动合并（${report.autoMerged.length} 家）`)
report.autoMerged.forEach(r => {
  const filled = r.filledFields.length ? `  补充: ${r.filledFields.join(', ')}` : ''
  const dist = r.distanceM > 50 ? `  坐标偏移 ${r.distanceM}m` : ''
  console.log(`  ✓ ${r.existing}  →  ${r.amapName}${filled}${dist}`)
})

console.log(`\n【情况2】待人工确认（${report.needReview.length} 家）—— 未合并`)
report.needReview.forEach(r =>
  console.log(`  ? ${r.existing}  ↔  ${r.amapName}  (现有位置:"${r.hint1}" / 高德:"${r.hint2}")`)
)

console.log(`\n【情况3】一对多门店（需人工对应）`)
const seen3 = new Set()
report.oneToMany.forEach(r => {
  if (seen3.has(r.existing)) return
  seen3.add(r.existing)
  console.log(`\n  现有：${r.existing}`)
  r.candidates.forEach(c => {
    const t = temp.find(g => g.name === c)
    console.log(`    高德：${c}`)
    if (t) console.log(`          ${t.address}`)
  })
})

console.log(`\n${'─'.repeat(60)}`)
console.log(`【情况4】现有有、高德无（${report.notInAmap.length} 家，需人工核实坐标）`)
console.log(`${'─'.repeat(60)}`)
report.notInAmap.forEach(r => {
  const gym = existing.find(g => (g.mapLabel || g.name) === r.gym)
  console.log(`  ${r.gym}`)
  console.log(`    区域：${r.district}  坐标：${gym?.coordinates.lat},${gym?.coordinates.lng}${gym?.coordinates.approx ? '  ⚠ approx' : ''}`)
  console.log(`    地址：${gym?.address || '（空）'}`)
})

console.log(`\n${'─'.repeat(60)}`)
console.log(`【情况5】高德有、现有无（${report.newInAmap.length} 家，是否新增？）`)
console.log(`${'─'.repeat(60)}`)
report.newInAmap.forEach(r => {
  console.log(`  ${r.name}`)
  console.log(`    区域：${r.district}`)
  console.log(`    地址：${r.address || '（空）'}`)
})

console.log(`\n【情况6】营业状态异常（${report.statusAlert.length} 家）`)
report.statusAlert.forEach(r =>
  console.log(`  ⚠ ${r.existing}  高德名称: ${r.amapName}  状态: ${r.status}`)
)

console.log(`\n【情况7】坐标偏差 > 500m（${report.coordConflict.length} 家）`)
report.coordConflict.forEach(r =>
  console.log(`  △ ${r.name}  偏差 ${r.distanceM}m  现有:${r.existingCoord}  高德:${r.amapCoord}`)
)

console.log('\n════════════════════════════════════════\n')

// ── 写出合并文件 + 报告文件 ───────────────────────────────

const reportLines = []
const log = s => { console.log(s); reportLines.push(s) }

// 重新生成报告内容到文件（复用上面的数据，简化版）
const reportContent = [
  '# 岩馆数据合并报告',
  `生成时间：${new Date().toLocaleString('zh-CN')}`,
  '',
  `## 情况3：一对多门店（需人工对应，共 ${[...new Set(report.oneToMany.map(r=>r.existing))].length} 个品牌）`,
  '',
  ...[...new Set(report.oneToMany.map(r => r.existing))].flatMap(name => {
    const r = report.oneToMany.find(x => x.existing === name)
    return [
      `### 现有：${name}`,
      ...r.candidates.map(c => {
        const t = temp.find(g => g.name === c)
        return `- 高德：**${c}**\n  地址：${t?.address || '（空）'}`
      }),
      '',
    ]
  }),
  `## 情况4：现有有、高德无（${report.notInAmap.length} 家，需人工核实坐标）`,
  '',
  ...report.notInAmap.map(r => {
    const gym = existing.find(g => (g.mapLabel || g.name) === r.gym)
    return [
      `### ${r.gym}`,
      `- 区域：${r.district}`,
      `- 坐标：${gym?.coordinates.lat}, ${gym?.coordinates.lng}${gym?.coordinates.approx ? '  ⚠ approx（估算）' : ''}`,
      `- 地址：${gym?.address || '（空）'}`,
      '',
    ].join('\n')
  }),
  `## 情况5：高德有、现有无（${report.newInAmap.length} 家，是否新增？）`,
  '',
  ...report.newInAmap.map(r => [
    `### ${r.name}`,
    `- 区域：${r.district}`,
    `- 地址：${r.address || '（空）'}`,
    '',
  ].join('\n')),
].join('\n')

fs.writeFileSync(
  path.join(__dirname, '../data/merge-report.md'),
  reportContent, 'utf8'
)
console.log('报告已写入 data/merge-report.md\n')

const outPath = path.join(__dirname, '../data/gyms-merged.json')
fs.writeFileSync(outPath, JSON.stringify({
  ...existingData,
  _meta: { ...existingData._meta, version: '0.6', lastUpdated: new Date().toISOString().slice(0, 10) },
  gyms: mergedGyms,
}, null, 2), 'utf8')

console.log(`已写入 data/gyms-merged.json（${mergedGyms.length} 家）`)
console.log('确认无误后执行：cp data/gyms-merged.json data/gyms.json\n')

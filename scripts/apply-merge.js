// 根据 merge-report.md 的人工批注，将所有变更一次性应用到 gyms.json
// 从 gyms-merged.json（已自动合并）为基础，追加手动修正
// 用法：node scripts/apply-merge.js

const fs = require('fs')
const path = require('path')
const { geoContains } = require('d3-geo')

const base = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/gyms-merged.json'), 'utf8'))
const districts = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/beijing-districts.json'), 'utf8'))

function lookupDistrict(lng, lat) {
  const f = districts.features.find(f => geoContains(f, [lng, lat]))
  return f ? f.properties.name.replace('区', '') : ''
}

function coord(lat, lng) {
  return { lat, lng, approx: false }
}

function gym(id, name, mapLabel, type, status, lat, lng, address, phone, businessHours, audience = []) {
  const district = lookupDistrict(lng, lat)
  return { id, name, mapLabel, type, district, status, coordinates: coord(lat, lng), address, phone, businessHours, price: { ticket: '', coaching: '' }, grades: { boulder: '', lead: '' }, routeSetDifficulty: '', audience }
}

let gyms = base.gyms.map(g => ({ ...g }))

// ── 工具 ──────────────────────────────────────────────────
const byId = id => gyms.findIndex(g => g.id === id)
const update = (id, patch) => {
  const i = byId(id)
  if (i === -1) { console.warn('未找到:', id); return }
  gyms[i] = { ...gyms[i], ...patch }
  if (patch.coordinates) gyms[i].district = lookupDistrict(patch.coordinates.lng, patch.coordinates.lat) || gyms[i].district
}
const remove = id => { gyms = gyms.filter(g => g.id !== id) }

// ════════════════════════════════════════════════════════
// 情况3：手动对应，用高德名称+数据更新
// ════════════════════════════════════════════════════════

// 奥攀（上地）→ 超级奥攀(装修中)
update('gym_002', {
  mapLabel: '超级奥攀(装修中)',
  status: 'renovation',
  address: '北京城区大屯北路78号',
})

// 奥攀（鸿坤广场）→ 奥攀攀岩(西红门店)
update('gym_048', {
  mapLabel: '奥攀攀岩(西红门店)',
  address: '西红门欣旺北大街8号鸿坤广场购物中心F1层',
})

// 岩时（西三旗）→ 岩时攀登中心
update('gym_003', {
  mapLabel: '岩时攀登中心',
  address: '西三旗街道建材城中路27号金隅智造工场S1-W',
})

// 岩时（大望路）→ 岩时攀岩馆
update('gym_031', {
  mapLabel: '岩时攀岩馆',
  address: '西大望路27号院74栋(平乐园地铁站B东北口步行410米)',
})

// Camp4（将台）→ CAMP4攀岩馆(酒仙桥新辰里店)
update('gym_021', {
  mapLabel: 'CAMP4攀岩馆(酒仙桥新辰里店)',
  address: '酒仙桥路12号新辰里酒仙桥店2层F2-005',
})

// Camp4（三里屯）→ CAMP4岩肆
update('gym_027', {
  mapLabel: 'CAMP4岩肆',
  address: '三里屯街道中海置业白家庄商务中心A座二楼',
})

// 日坛攀岩（朝阳门）→ 与金点石是同一位置，删除，保留 gym_030
remove('gym_029')

// 飞猫（朝阳门）→ 飞猫攀岩(Feline Climbing Gym)
update('gym_038', {
  mapLabel: '飞猫攀岩(Feline Climbing Gym)',
  address: '南竹杆胡同2号银河SOHO商场C座F3层',
})

// 青山攀石 → 删除旧条目，用高德两条替换（见下方新增）
remove('gym_004')

// ════════════════════════════════════════════════════════
// 情况4：高德无，人工提供数据
// ════════════════════════════════════════════════════════

// 华攀攀岩（地质大学）→ 删除
remove('gym_006')

// COG（首钢）→ Climb On Gym(六工汇购物广场店)
update('gym_010', {
  mapLabel: 'Climb On Gym(六工汇购物广场店)',
  coordinates: coord(39.92, 116.16),
  address: '北京市石景山区群明湖大街与群明湖北路交叉口西北角六工汇购物广场F1',
})

// 趣野（腾讯众创空间）→ 补充地址电话，坐标不变
update('gym_011', {
  address: '回龙观东大街338号创客广场A1',
  phone: '13401027301',
})

// 趣野（龙湖）→ 实为朝阳龙湖北苑天街
update('gym_014', {
  mapLabel: '趣野攀岩(北京朝阳龙湖北苑天街店)',
  coordinates: coord(40.05, 116.44),
  address: '北京市朝阳区北苑东路19号院龙湖北苑天街商场A座5层02号',
})

// 北顶奥森 2.0 → 补充地址电话，mapLabel 更新
update('gym_015', {
  mapLabel: '北顶奥森攀岩生态园',
  address: '北京市朝阳区奥林西路奥林匹克森林公园南园',
  phone: '13401027301',
})

// COL（来广营）→ 用高德数据
update('gym_020', {
  mapLabel: 'Climb On Gym攀岩馆(来广营店COL)',
  coordinates: coord(40.016575, 116.465825),
  address: '香宾路66号保利广场东区1层L6',
  phone: '13661351835',
})

// 趣攀岩（朝阳）→ 趣攀岩(龙玥城店)，实在大兴
update('gym_036', {
  mapLabel: '趣攀岩(龙玥城店)',
  coordinates: coord(39.81, 116.54),
  address: '北京市大兴区经济开发区科创五街38号院1号楼D座一层',
})

// 黑攀 → 黑爆攀岩共享空间(丰科万达店)
update('gym_043', {
  mapLabel: '黑爆攀岩共享空间(丰科万达店)',
  coordinates: coord(39.83, 116.31),
  address: '北京市丰台区汽车博物馆西路9号院5号楼',
})

// 趣野（房山）→ 趣野攀岩(北京房山印象城店)
update('gym_050', {
  mapLabel: '趣野攀岩(北京房山印象城店)',
  coordinates: coord(39.76, 116.22),
  address: '北京市房山区广阳新路9号院1号楼北京房山印象城2层',
})

// 此山（未开业）→ 此山攀岩(亦庄通明湖商业港店)，实在通州
update('gym_052', {
  mapLabel: '此山攀岩(亦庄通明湖商业港店)',
  coordinates: coord(39.79, 116.59),
  address: '北京市通州区台湖镇经惠西路亦庄信万广场明湖商业港B1',
})

// 趣攀岩（通州）→ 与 gym_036 趣攀岩(龙玥城店)为同一家，删除
remove('gym_053')

// 人人攀岩（丽泽）→ 补充更精确地址和坐标
update('gym_040', {
  mapLabel: '人人攀岩(丽泽店)',
  address: '北京市丰台区玉璞路6号-2室',
  coordinates: coord(39.88, 116.31),
})

// ════════════════════════════════════════════════════════
// 情况5：新增场馆
// ════════════════════════════════════════════════════════

const newGyms = [
  // 日坛攀岩馆（与金点石不同，另一家）
  gym('gym_054', '日坛攀岩', '日坛攀岩馆', '', 'open',
    39.918597, 116.442483,
    '北京城区日坛国际贸易中心B座B1-087号', '13011153700',
    '周一至周日 10:00-23:00'),

  // 青山攀石(清河店) — 替换旧 gym_004
  gym('gym_055', '青山攀石', '青山攀石(清河店)', '', 'open',
    40.041462, 116.352983,
    '北京城区毛纺东路青核INNNG国际人才社区2层', '', ''),

  // 青山攀石(魏公村店)
  gym('gym_056', '青山攀石', '青山攀石(魏公村店)', '', 'open',
    39.956194, 116.321071,
    '北京城区魏公芳华里B1（蚂蚁集团楼下）', '13121130069',
    '周一至周日 10:00-22:00'),

  // 攀猩儿童攀岩馆(悠唐购物中心店)
  gym('gym_057', '攀猩', '攀猩儿童攀岩馆(悠唐购物中心店)', '', 'open',
    39.921575, 116.438775,
    '三丰路2号悠唐购物中心F3层', '',
    '周一至周日 10:00-22:00'),

  // 攀岩最爱常营馆
  gym('gym_058', '攀岩最爱', '攀岩最爱常营馆', '', 'open',
    39.926219, 116.610147,
    '首开畅心园东南门旁', '13651386344',
    '周六至周日 09:00-21:00；周一至周五 14:00-21:00'),

  // 红松果攀岩馆
  gym('gym_059', '红松果', '红松果攀岩馆', '', 'open',
    39.687286, 116.303993,
    '永大路32号', '18500606724',
    '周六至周日 10:00-20:00'),

  // 攀猩攀岩(合生广场店)
  gym('gym_060', '攀猩', '攀猩攀岩(合生广场店)', '', 'open',
    39.855747, 116.397726,
    '大红门街道永外果园8号合生广场一层', '13141055528',
    '周一至周日 10:00-21:00'),

  // 极度体验攀岩馆
  gym('gym_061', '极度体验', '极度体验攀岩馆(世纪金源购物中心西区店)', '', 'open',
    39.958377, 116.287827,
    '远大路1号世纪金源购物中心西区L1层', '',
    '周一至周日 10:00-21:00'),

  // 耀岩攀岩馆
  gym('gym_062', '耀岩', '耀岩攀岩馆', '', 'open',
    40.098675, 116.550425,
    '裕满路与裕华路交叉口西南140米', '',
    '周一至周日 10:00-20:00'),
]

gyms.push(...newGyms)

// 重新用坐标计算所有区，并排序
gyms.forEach(g => {
  const d = lookupDistrict(g.coordinates.lng, g.coordinates.lat)
  if (d) g.district = d
})

// 输出
const out = {
  ...base,
  _meta: { ...base._meta, version: '0.6', lastUpdated: new Date().toISOString().slice(0, 10), total: gyms.length },
  gyms,
}

fs.writeFileSync(path.join(__dirname, '../data/gyms.json'), JSON.stringify(out, null, 2), 'utf8')
console.log(`✓ gyms.json 已更新，共 ${gyms.length} 家`)
console.log('\n各区分布：')
const byDistrict = {}
gyms.forEach(g => { byDistrict[g.district] = (byDistrict[g.district] || 0) + 1 })
Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]).forEach(([d,n]) => console.log(`  ${d}：${n} 家`))

// 注意缦合·奥攀在 情况3 批注为"不新增"，情况5 批注为"要"，存在矛盾，请人工确认
console.log('\n⚠ 注意：缦合·奥攀攀岩 在报告中存在矛盾批注（情况3：不新增 / 情况5：要），已暂不添加，请确认后手动处理')

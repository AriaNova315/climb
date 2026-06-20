// 根据岩馆经纬度，对照北京行政区 GeoJSON 边界，自动更新 district 字段
// 用法：node scripts/update-districts.js

const { geoContains } = require('d3-geo')
const fs = require('fs')
const path = require('path')

const districtsPath = path.join(__dirname, '../data/beijing-districts.json')
const gymsPath = path.join(__dirname, '../data/gyms.json')

const districts = JSON.parse(fs.readFileSync(districtsPath, 'utf8'))
const gymsData = JSON.parse(fs.readFileSync(gymsPath, 'utf8'))

let updated = 0
let notFound = 0

gymsData.gyms = gymsData.gyms.map(gym => {
  const { lng, lat } = gym.coordinates
  const point = [lng, lat]

  const match = districts.features.find(f => geoContains(f, point))

  if (match) {
    const newDistrict = match.properties.name.replace('区', '')
    if (newDistrict !== gym.district) {
      console.log(`[更新] ${gym.mapLabel}：${gym.district} → ${newDistrict}`)
      updated++
    }
    return { ...gym, district: newDistrict }
  } else {
    console.log(`[未匹配] ${gym.mapLabel}（${lng}, ${lat}）保留原值：${gym.district}`)
    notFound++
    return gym
  }
})

fs.writeFileSync(gymsPath, JSON.stringify(gymsData, null, 2), 'utf8')
console.log(`\n完成：更新 ${updated} 家，未匹配 ${notFound} 家`)

export type GymType = '综合' | '抱石' | '难度'
export type GymStatus = 'open' | 'coming_soon'
export type RouteSetDifficulty = '软' | '正常' | '硬' | ''

export interface GymCoordinates {
  lat: number
  lng: number
  approx?: boolean
}

export interface GymPrice {
  ticket: string
  coaching: string
}

export interface GymGrades {
  boulder: string
  lead: string
}

export interface Gym {
  id: string
  name: string
  mapLabel: string
  type: GymType
  district: string
  status: GymStatus
  coordinates: GymCoordinates
  address: string
  phone: string
  businessHours: string
  price: GymPrice
  grades: GymGrades
  routeSetDifficulty: RouteSetDifficulty
  audience: string[]
}

export interface GymsMeta {
  version: string
  lastUpdated: string
  total: number
  colorScheme: Record<GymType, string>
  note: string
}

export interface GymsData {
  _meta: GymsMeta
  gyms: Gym[]
}

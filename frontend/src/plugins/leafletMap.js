/**
 * Leaflet Map Plugin (무료 OpenStreetMap 사용)
 * API 키 불필요 + Geolocation API 지원 + IP 기반 위치 fallback
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet 기본 마커 아이콘 수정 (webpack 이슈 해결)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

// 기본 위치 (구미)
const DEFAULT_POSITION = { lat: 36.1194, lng: 128.3446 }

// 현재 위치 저장 (캐시)
let currentPosition = null

/**
 * IP 기반 위치 가져오기 (무료 API)
 * @returns {Promise<{lat: number, lng: number}>}
 */
const getPositionByIP = async () => {
  try {
    // ip-api.com (무료, CORS 지원)
    const response = await fetch('http://ip-api.com/json/?fields=lat,lon')
    const data = await response.json()
    if (data.lat && data.lon) {
      console.log('IP-based position:', data.lat, data.lon)
      return { lat: data.lat, lng: data.lon }
    }
  } catch (error) {
    console.warn('IP location failed:', error.message)
  }
  return null
}

/**
 * 현재 위치 가져오기 (Geolocation API → IP API → 기본값)
 * @returns {Promise<{lat: number, lng: number}>}
 */
export const getCurrentPosition = () => {
  return new Promise(async (resolve) => {
    // 이미 위치를 가져왔으면 캐시된 값 반환
    if (currentPosition) {
      resolve(currentPosition)
      return
    }

    // 1차: Geolocation API 시도
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          console.log('Geolocation success:', currentPosition)
          resolve(currentPosition)
        },
        async (error) => {
          console.warn('Geolocation failed:', error.message)
          
          // 2차: IP 기반 위치 시도
          const ipPosition = await getPositionByIP()
          if (ipPosition) {
            currentPosition = ipPosition
            resolve(currentPosition)
          } else {
            // 3차: 기본 위치 사용
            console.log('Using default position')
            resolve(DEFAULT_POSITION)
          }
        },
        {
          enableHighAccuracy: false,  // 더 빠른 응답
          timeout: 10000,             // 10초
          maximumAge: 600000          // 10분 캐시
        }
      )
    } else {
      // Geolocation 미지원 시 IP 기반 시도
      console.warn('Geolocation not supported')
      const ipPosition = await getPositionByIP()
      if (ipPosition) {
        currentPosition = ipPosition
        resolve(currentPosition)
      } else {
        resolve(DEFAULT_POSITION)
      }
    }
  })
}

/**
 * 현재 위치 주변에 랜덤 좌표 생성
 * @param {Object} center - 중심 좌표 {lat, lng}
 * @param {number} radiusKm - 반경 (km)
 * @returns {{lat: number, lng: number}}
 */
export const generateNearbyPosition = (center, radiusKm = 0.5) => {
  // 랜덤 거리와 방향
  const r = radiusKm * Math.sqrt(Math.random())
  const theta = Math.random() * 2 * Math.PI

  // 위도/경도 변환 (대략적인 계산)
  const latOffset = (r / 111) * Math.cos(theta)
  const lngOffset = (r / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(theta)

  return {
    lat: center.lat + latOffset,
    lng: center.lng + lngOffset
  }
}

/**
 * 밴드 데이터에 현재 위치 기반 좌표 할당
 * @param {Array} bands - 밴드 배열
 * @param {Object} center - 중심 좌표
 * @returns {Array} 좌표가 할당된 밴드 배열
 */
export const assignBandPositions = (bands, center) => {
  return bands.map((band, index) => {
    // 현재 위치 주변에 배치 (0.2~0.6km 반경)
    const pos = generateNearbyPosition(center, 0.2 + (index * 0.15))
    return {
      ...band,
      latitude: pos.lat,
      longitude: pos.lng
    }
  })
}

// 커스텀 마커 아이콘
const createCustomIcon = (color = '#257E53', isOnline = true) => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      ${isOnline ? '<circle cx="12" cy="9" r="3" fill="#10b981"/>' : '<circle cx="12" cy="9" r="3" fill="#9ca3af"/>'}
    </svg>
  `
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

// 관리자 마커 아이콘
const createAdminIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <path fill="#257E53" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      <circle cx="12" cy="9" r="3" fill="#1e40af"/>
    </svg>
  `
  return L.divIcon({
    html: svgIcon,
    className: 'admin-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  })
}

/**
 * 지도 생성
 * @param {HTMLElement} container - 지도 컨테이너
 * @param {Object} options - 옵션
 * @returns {L.Map} Leaflet 맵 객체
 */
export const createMap = (container, options = {}) => {
  const defaultOptions = {
    center: [DEFAULT_POSITION.lat, DEFAULT_POSITION.lng],
    zoom: 15,
    zoomControl: true
  }

  const mapOptions = { ...defaultOptions, ...options }
  
  const map = L.map(container, {
    center: mapOptions.center,
    zoom: mapOptions.zoom,
    zoomControl: mapOptions.zoomControl
  })

  // OpenStreetMap 타일 레이어 추가 (무료)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map)

  return map
}

/**
 * 관리자 마커 생성
 * @param {L.Map} map - Leaflet 맵 객체
 * @param {Object} position - {lat, lng}
 * @returns {L.Marker} 마커 객체
 */
export const createAdminMarker = (map, position) => {
  const icon = createAdminIcon()
  const marker = L.marker([position.lat, position.lng], { icon }).addTo(map)
  marker.bindPopup('<b>현재 위치</b><br>관리자')
  return marker
}

/**
 * 밴드 마커 생성
 * @param {L.Map} map - Leaflet 맵 객체
 * @param {Object} band - 밴드 데이터
 * @returns {L.Marker} 마커 객체
 */
export const createBandMarker = (map, band) => {
  const lat = band.latitude || DEFAULT_POSITION.lat
  const lng = band.longitude || DEFAULT_POSITION.lng
  const isOnline = band.status === 'online'
  
  const icon = createCustomIcon('#257E53', isOnline)
  
  const marker = L.marker([lat, lng], { icon }).addTo(map)
  
  // 팝업 내용
  const popupContent = `
    <div style="min-width: 150px; font-family: sans-serif;">
      <div style="font-weight: 600; margin-bottom: 8px;">${band.user_name || band.user || '사용자'}</div>
      <div style="font-size: 12px; color: #666;">
        <div>밴드 ID: ${band.band_id || band.id || '-'}</div>
        <div>상태: <span style="color: ${isOnline ? '#10b981' : '#9ca3af'}">${isOnline ? '온라인' : '오프라인'}</span></div>
        ${band.heart_rate || band.hr ? `<div>심박수: ${band.heart_rate || band.hr} BPM</div>` : ''}
        ${band.battery ? `<div>배터리: ${band.battery}%</div>` : ''}
      </div>
    </div>
  `
  
  marker.bindPopup(popupContent)
  
  return marker
}

/**
 * 여러 밴드 마커 생성
 * @param {L.Map} map - Leaflet 맵 객체
 * @param {Array} bands - 밴드 배열
 * @returns {Array} 마커 배열
 */
export const createBandMarkers = (map, bands) => {
  const markers = []
  
  bands.forEach(band => {
    if (band.latitude && band.longitude) {
      const marker = createBandMarker(map, band)
      markers.push(marker)
    }
  })
  
  // 모든 마커가 보이도록 맵 범위 조정
  if (markers.length > 0) {
    const group = L.featureGroup(markers)
    map.fitBounds(group.getBounds(), { padding: [20, 20] })
  }
  
  return markers
}

/**
 * 마커 업데이트
 * @param {L.Marker} marker - 마커 객체
 * @param {Object} band - 밴드 데이터
 */
export const updateMarker = (marker, band) => {
  const lat = band.latitude || DEFAULT_POSITION.lat
  const lng = band.longitude || DEFAULT_POSITION.lng
  
  marker.setLatLng([lat, lng])
}

/**
 * 모든 마커 제거
 * @param {L.Map} map - Leaflet 맵 객체
 * @param {Array} markers - 마커 배열
 */
export const clearMarkers = (map, markers) => {
  markers.forEach(marker => {
    map.removeLayer(marker)
  })
}

export default {
  getCurrentPosition,
  generateNearbyPosition,
  assignBandPositions,
  createMap,
  createAdminMarker,
  createBandMarker,
  createBandMarkers,
  updateMarker,
  clearMarkers
}

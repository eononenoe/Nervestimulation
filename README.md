# Wellsafer - 건강관리 통합 플랫폼

신경자극 및 생체신호 모니터링을 위한 통합 건강관리 시스템

## 프로젝트 구조

```
Nervestimulation/
├── backend/              # Flask 백엔드 서버
│   ├── api/             # REST API 엔드포인트
│   ├── db/              # 데이터베이스 모델 및 쿼리
│   └── sms/             # SMS 알림 기능
├── frontend/            # Vue.js 웹 관리자 대시보드
├── mobile/              # React Native 모바일 앱 (구현 예정)
├── wellsafer_app.html   # 모바일 앱 디자인 프로토타입
└── main.py              # Flask 서버 진입점
```

---

## Mobile App 구현 계획

### 목표
wellsafer_app.html을 기반으로 iOS/Android 범용 React Native 앱 구축
- 기존 Flask 백엔드 API 활용
- 모든 디바이스에서 깨지지 않는 반응형 UI
- Socket.IO를 통한 실시간 생체신호 업데이트

### 기술 스택
- **프레임워크**: React Native (Expo)
- **UI 라이브러리**: React Native Paper (Material Design)
- **상태관리**: React Context API + Hooks
- **실시간 통신**: Socket.IO Client
- **네비게이션**: React Navigation
- **HTTP 클라이언트**: Axios
- **아이콘**: MaterialCommunityIcons (@expo/vector-icons)

---

## 구현 단계

### 1단계: React Native 프로젝트 초기화
**위치**: `mobile/` 폴더 생성

**작업 내용**:
- Expo CLI로 React Native 프로젝트 생성
- 필요한 패키지 설치:
  - react-native-paper (UI 컴포넌트)
  - @react-navigation/native, @react-navigation/bottom-tabs (네비게이션)
  - axios (HTTP 클라이언트)
  - socket.io-client (실시간 통신)
  - react-native-safe-area-context (안전 영역 처리)
  - @expo/vector-icons (Material Design 아이콘)

**구조**:
```

  mobile/
  ├── src/
  │   ├── components/          # 재사용 가능한 UI 컴포넌트
  │   │   ├── AppHeader.js
  │   │   ├── StatCard.js
  │   │   ├── AlertItem.js
  │   │   ├── BandListItem.js
  │   │   ├── QuickActionButton.js
  │   │   ├── VitalCard.js
  │   │   └── BandDetailModal.js
  │   ├── contexts/            # Context API 상태관리
  │   │   ├── AuthContext.js
  │   │   ├── DashboardContext.js
  │   │   ├── BandContext.js
  │   │   └── SocketContext.js
  │   ├── navigation/          # 네비게이션 설정
  │   │   └── MainNavigator.js
  │   ├── screens/             # 화면 컴포넌트
  │   │   ├── LoginScreen.js
  │   │   ├── DashboardScreen.js
  │   │   ├── NerveStimScreen.js
  │   │   ├── BloodPressureScreen.js
  │   │   ├── ReportScreen.js
  │   │   ├── DeviceScreen.js
  │   │   └── SettingsScreen.js
  │   ├── services/            # API 및 Socket 서비스
  │   │   ├── api.js
  │   │   └── socket.js
  │   └── utils/               # 유틸리티 (반응형, 테마)
  │       ├── responsive.js
  │       └── theme.js

```

---

### 2단계: 반응형 레이아웃 시스템 구축

**문제점**: wellsafer_app.html은 iPhone 8 고정 크기 (375x667)로 하드코딩됨

**해결 방안**:
- `Dimensions` API로 화면 크기 동적 감지
- `useWindowDimensions` Hook 활용
- 비율 기반 스타일링 (`width: '90%'`, Flexbox)
- `react-native-responsive-fontsize`로 폰트 크기 자동 조정
- SafeAreaView로 노치/상태바 영역 자동 처리

**생성 파일**: `src/utils/responsive.js`
```javascript
// 화면 크기별 스케일링 유틸리티
- scaleSize(size): 화면 너비 기준 크기 조정
- scaleFontSize(size): 폰트 크기 자동 조정
- getDeviceType(): 디바이스 타입 감지 (phone/tablet)
```

---

### 3단계: 컴포넌트 구조 설계 및 변환

#### 3.1 핵심 화면 컴포넌트
wellsafer_app.html의 섹션을 React Native로 변환:

1. **DashboardScreen** (`src/screens/DashboardScreen.js`)
   - 상태바 위젯 (시간/날씨)
   - 퀵 액션 버튼 (4개)
   - 통계 카드 (4개 그리드)
   - 생체신호 이상 알림 리스트
   - 밴드 목록

2. **NerveStimScreen** (`src/screens/NerveStimScreen.js`)
   - 신경자극 제어 화면
   - 세션 시작/종료
   - 강도/주파수 조절

3. **BloodPressureScreen** (`src/screens/BloodPressureScreen.js`)
   - 혈압 측정 기록
   - 차트/그래프
   - 측정 이력

4. **ReportScreen** (`src/screens/ReportScreen.js`)
   - 리포트 목록
   - 리포트 생성
   - PDF 다운로드

5. **DeviceScreen** (`src/screens/DeviceScreen.js`)
   - 밴드 목록
   - 자극기 목록
   - 기기 상태 관리

#### 3.2 재사용 가능한 컴포넌트

**생성 파일들**:
- `src/components/StatusBar.js`: 앱 헤더 (시간/날씨)
- `src/components/StatCard.js`: 통계 카드 (등록밴드, 온라인 등)
- `src/components/AlertItem.js`: 알림 아이템 (위험/주의)
- `src/components/BandListItem.js`: 밴드 목록 아이템
- `src/components/QuickActionButton.js`: 퀵 액션 버튼
- `src/components/BandDetailModal.js`: 밴드 상세 모달 (bottom sheet)
- `src/components/VitalCard.js`: 생체신호 카드 (심박/SpO2/혈압)

#### 3.3 색상 시스템
wellsafer_app.html의 색상 팔레트를 theme으로 정의:

**생성 파일**: `src/utils/theme.js`
```javascript
{
  colors: {
    primary: '#257E53',      // Wellsafer 메인 그린
    primaryDark: '#1a5c3a',
    accent: '#43E396',       // 밝은 그린
    background: '#F2F9F5',   // 배경
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    grey: '#6b7280'
  }
}
```

---

### 4단계: API 통신 레이어 구축

#### 4.1 Axios 인스턴스 설정
**생성 파일**: `src/services/api.js`

기존 백엔드 API 엔드포인트 연동:
- `GET /api/dashboard/` - 대시보드 데이터
- `GET /api/bands/` - 밴드 목록
- `GET /api/bands/<id>/` - 밴드 상세
- `GET /api/nervestim/sessions/` - 신경자극 세션
- `POST /api/nervestim/sessions/` - 세션 시작
- `PATCH /api/nervestim/sessions/<id>/stop/` - 세션 종료
- `GET /api/bloodpressure/records/` - 혈압 기록
- `POST /api/bloodpressure/records/` - 혈압 추가
- `GET /api/reports/` - 리포트 목록
- `POST /api/reports/generate/` - 리포트 생성
- `GET /api/devices/bands/` - 밴드 기기 목록
- `GET /api/devices/stimulators/` - 자극기 목록
- `POST /api/auth/login/` - 로그인
- `POST /api/auth/logout/` - 로그아웃

#### 4.2 API 서비스 함수
```javascript
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard/'),
  getBands: () => api.get('/bands/'),
  getBandDetail: (id) => api.get(`/bands/${id}/`)
};

export const nerveStimAPI = {
  getSessions: () => api.get('/nervestim/sessions/'),
  startSession: (data) => api.post('/nervestim/sessions/', data),
  stopSession: (id, data) => api.patch(`/nervestim/sessions/${id}/stop/`, data)
};

// ... 나머지 API 함수들
```

---

### 5단계: Socket.IO 실시간 통신 구현

**생성 파일**: `src/services/socket.js`

기존 백엔드의 Socket.IO 서버에 연결:
- 서버 주소: Flask 서버의 Socket.IO 엔드포인트
- 네임스페이스: 기본 '/'
- 토픽:
  - `sensor_update` - 센서 데이터 실시간 업데이트
  - `alert_new` - 새 알림
  - `band_status` - 밴드 연결 상태 변경

**구현 내용**:
```javascript
import io from 'socket.io-client';

class SocketService {
  connect(serverUrl, token) {
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      auth: { token }
    });

    this.socket.on('connect', () => console.log('Socket connected'));
    this.socket.on('sensor_update', this.handleSensorUpdate);
    this.socket.on('alert_new', this.handleNewAlert);
  }

  // 이벤트 핸들러들...
}
```

**Context 통합**: Socket 이벤트를 Context API로 전파하여 UI 자동 업데이트

---

### 6단계: Context API 상태관리 구현

#### 6.1 Context 구조
**생성 파일들**:

1. `src/contexts/AuthContext.js`
   - 로그인 상태
   - 사용자 정보
   - 토큰 관리

2. `src/contexts/DashboardContext.js`
   - 대시보드 데이터
   - 알림 목록
   - 밴드 목록

3. `src/contexts/BandContext.js`
   - 선택된 밴드
   - 밴드 상세 정보
   - 실시간 센서 데이터

4. `src/contexts/SocketContext.js`
   - Socket 연결 상태
   - 실시간 이벤트 처리

#### 6.2 Provider 구조
```javascript
// App.js
<AuthProvider>
  <SocketProvider>
    <DashboardProvider>
      <BandProvider>
        <NavigationContainer>
          {/* App 내용 */}
        </NavigationContainer>
      </BandProvider>
    </DashboardProvider>
  </SocketProvider>
</AuthProvider>
```

---

### 7단계: 네비게이션 구현

#### 7.1 하단 탭 네비게이션
wellsafer_app.html의 bottom-nav를 React Navigation으로 구현:

**생성 파일**: `src/navigation/MainNavigator.js`

탭 구조:
1. 대시보드 (mdi-view-dashboard)
2. 신경자극 (mdi-flash)
3. 혈압 (mdi-heart-pulse)
4. 사용자 (mdi-account-group)
5. 설정 (mdi-cog)

#### 7.2 네비게이션 스택
```javascript
- AuthStack: 로그인 화면
- MainStack:
  - BottomTabNavigator (메인 탭들)
  - BandDetailModal (모달)
  - ReportDetailModal (모달)
```

---

### 8단계: 세부 기능 구현

#### 8.1 시간/날씨 위젯
- `setInterval`로 1초마다 시간 업데이트
- 날씨 API 또는 백엔드에서 날씨 데이터 가져오기
- 한국 날짜 포맷 (YYYY년 M월 D일 요일)

#### 8.2 스와이프 제스처
- `react-native-gesture-handler`로 모달 닫기 구현
- PanResponder로 상세 패널 스와이프 다운

#### 8.3 차트/그래프
- `react-native-chart-kit` 또는 `victory-native` 사용
- 혈압 추이 그래프
- 주간 통계 차트

#### 8.4 알림/권한
- `expo-notifications`로 푸시 알림
- 위치 권한 요청 (지도 기능)

---

### 9단계: 반응형 처리 세부사항

#### 9.1 화면 크기별 대응
```javascript
// utils/responsive.js 활용
const { width, height } = useWindowDimensions();

// 컴포넌트에서:
const cardWidth = width > 768 ? '45%' : '90%'; // 태블릿 vs 폰
const fontSize = scaleFont(14);
```

#### 9.2 SafeAreaView 적용
모든 화면에 SafeAreaView 래핑으로 노치 대응:
```jsx
<SafeAreaView style={{ flex: 1 }}>
  {/* 화면 내용 */}
</SafeAreaView>
```

#### 9.3 플랫폼별 분기
```javascript
import { Platform } from 'react-native';

const statusBarHeight = Platform.OS === 'ios' ? 20 : StatusBar.currentHeight;
```

---

### 10단계: 스타일링 및 테마

#### 10.1 React Native Paper 테마 커스터마이징
```javascript
// src/utils/theme.js
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#257E53',
    accent: '#43E396',
    // wellsafer_app.html 색상 적용
  },
  fonts: {
    // Noto Sans KR 웹폰트 대신 시스템 폰트 사용
    regular: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }
  }
};
```

#### 10.2 그라데이션 처리
wellsafer_app.html의 gradient 효과:
- `expo-linear-gradient` 사용
- 헤더, 버튼 등에 적용

---

## 주요 변환 매핑

### HTML → React Native 컴포넌트

| HTML 요소 | React Native 컴포넌트 |
|-----------|----------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>` |
| `<button>` | `<TouchableOpacity>` + `<Text>` 또는 `<Button>` |
| `<input>` | `<TextInput>` |
| `.phone-screen` | `<View>` + flex:1 |
| `.status-bar` | `StatusBar` 컴포넌트 |
| `.bottom-nav` | `BottomTabNavigator` |
| `.detail-panel` | `Modal` + `Animated` |
| `.alert-card` | `Card` + FlatList |
| `.band-list` | `FlatList` + `BandListItem` |

### CSS → StyleSheet

| CSS 속성 | React Native 스타일 |
|----------|---------------------|
| `display: flex` | 기본값 (생략 가능) |
| `flex-direction: column` | 기본값 |
| `justify-content: space-between` | `justifyContent: 'space-between'` |
| `border-radius: 12px` | `borderRadius: 12` |
| `box-shadow` | `shadowColor`, `shadowOffset`, `shadowRadius`, `elevation` (Android) |
| `background: linear-gradient(...)` | `<LinearGradient>` 컴포넌트 |
| `overflow-y: auto` | `<ScrollView>` 또는 `<FlatList>` |
| `position: fixed` | `position: 'absolute'` |

---

## 환경 설정

### 백엔드 연결 설정
**생성 파일**: `mobile/.env`
```
API_BASE_URL=http://192.168.x.x:5000/api
SOCKET_URL=http://192.168.x.x:5000
```

개발 환경:
- iOS Simulator: `http://localhost:5000`
- Android Emulator: `http://10.0.2.2:5000`
- 실제 디바이스: 컴퓨터 로컬 IP 사용

---

## 검증 및 테스트

### 1. 반응형 테스트
- iOS Simulator: iPhone SE (작은 화면), iPhone 14 Pro Max (큰 화면)
- Android Emulator: Pixel 5 (중간), Nexus 9 (태블릿)
- 실제 디바이스 테스트 권장

### 2. 기능 테스트
- [ ] 로그인/로그아웃
- [ ] 대시보드 데이터 로딩
- [ ] 밴드 목록 조회 및 상세 보기
- [ ] 신경자극 세션 시작/종료
- [ ] 혈압 기록 추가 및 조회
- [ ] 리포트 생성
- [ ] 실시간 데이터 업데이트 (Socket.IO)
- [ ] 알림 표시

### 3. 네트워크 테스트
- 백엔드 서버 연결 확인
- API 응답 확인 (Postman/curl)
- Socket.IO 연결 확인

### 4. 실행 명령어
```bash
cd mobile
npm start          # Expo 개발 서버 시작
npm run ios        # iOS 시뮬레이터
npm run android    # Android 에뮬레이터
```

---

## 주요 파일 목록

### 필수 생성 파일
```
mobile/
├── package.json
├── app.json
├── App.js
├── .env
└── src/
    ├── components/
    │   ├── StatusBar.js
    │   ├── StatCard.js
    │   ├── AlertItem.js
    │   ├── BandListItem.js
    │   ├── QuickActionButton.js
    │   ├── BandDetailModal.js
    │   └── VitalCard.js
    ├── contexts/
    │   ├── AuthContext.js
    │   ├── DashboardContext.js
    │   ├── BandContext.js
    │   └── SocketContext.js
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── DashboardScreen.js
    │   ├── NerveStimScreen.js
    │   ├── BloodPressureScreen.js
    │   ├── ReportScreen.js
    │   ├── DeviceScreen.js
    │   └── SettingsScreen.js
    ├── navigation/
    │   └── MainNavigator.js
    ├── services/
    │   ├── api.js
    │   └── socket.js
    └── utils/
        ├── responsive.js
        └── theme.js
```

---

## 참고사항

### 폰트 처리
- wellsafer_app.html은 Noto Sans KR 웹폰트 사용
- React Native에서는 각 플랫폼의 시스템 폰트 사용 권장
- 필요시 `expo-font`로 커스텀 폰트 로드 가능

### 아이콘
- wellsafer_app.html은 Material Design Icons (MDI) 사용
- React Native Paper는 MaterialCommunityIcons 자동 지원
- 동일한 아이콘명 사용 가능 (예: 'mdi-heart-pulse' → 'heart-pulse')

### 네비게이션 바
- iOS: 하단 탭 바가 홈 인디케이터 위에 위치
- Android: 하단 탭 바가 화면 하단에 위치
- SafeAreaView로 자동 처리됨

---

## 백엔드 서버 실행

### 필요 환경
- Python 3.7+
- MySQL Database
- MQTT Broker (선택사항)

### 설치 및 실행
```bash
# 패키지 설치
pip install -r requirements.txt

# 데이터베이스 마이그레이션
python manage.py db upgrade

# 서버 실행
python main.py
```

서버는 기본적으로 `http://0.0.0.0:5000`에서 실행됩니다.

---

## 웹 프론트엔드 실행

```bash
cd frontend
npm install
npm run serve
```

웹 대시보드는 `http://localhost:8080/admin`에서 접근 가능합니다.

---

## 다음 단계 (구현 후)

1. **앱 아이콘 및 스플래시 스크린** 추가
2. **앱 빌드 및 배포**
   - iOS: App Store Connect
   - Android: Google Play Console
3. **푸시 알림** 설정 (생체신호 이상 감지시)
4. **오프라인 모드** 구현 (AsyncStorage)
5. **성능 최적화** (Memo, useMemo, useCallback)

---

## 라이센스

Proprietary - All rights reserved

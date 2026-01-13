# Wellsafer Mobile App

React Native 기반 건강관리 모바일 애플리케이션

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 열고 백엔드 서버 주소를 설정하세요:

```
API_BASE_URL=http://[서버주소]:5000/api
SOCKET_URL=http://[서버주소]:5000
```

**개발 환경별 주소:**
- iOS Simulator: `http://localhost:5000`
- Android Emulator: `http://10.0.2.2:5000`
- 실제 디바이스: `http://[컴퓨터 로컬 IP]:5000`

### 3. 앱 실행

```bash
# Expo 개발 서버 시작
npm start

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

## 기능

- ✅ 대시보드 (실시간 생체신호 모니터링)
- ✅ 밴드 목록 및 상세 정보
- ✅ 실시간 알림
- ✅ Socket.IO 실시간 통신
- 🚧 신경자극 제어 (구현 예정)
- 🚧 혈압 측정 및 기록 (구현 예정)
- 🚧 건강 리포트 생성 (구현 예정)

## 기술 스택

- **프레임워크**: React Native (Expo)
- **UI 라이브러리**: React Native Paper
- **상태관리**: React Context API
- **네비게이션**: React Navigation
- **실시간 통신**: Socket.IO Client
- **HTTP 클라이언트**: Axios

## 프로젝트 구조

```
mobile/
├── src/
│   ├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── contexts/        # Context API 상태관리
│   ├── navigation/      # 네비게이션 설정
│   ├── screens/         # 화면 컴포넌트
│   ├── services/        # API 및 Socket 서비스
│   └── utils/           # 유틸리티 함수 (반응형, 테마)
├── App.js              # 앱 진입점
├── .env                # 환경 변수
└── package.json        # 패키지 설정
```

## 반응형 디자인

모든 디바이스 (iPhone, Android, 태블릿)에서 올바르게 표시되도록 반응형으로 설계되었습니다.

- 화면 크기 자동 감지
- 동적 폰트 크기 조정
- SafeAreaView로 노치 대응

## 백엔드 연동

Flask 백엔드 서버가 실행 중이어야 합니다:

```bash
# 백엔드 서버 실행 (프로젝트 루트에서)
python main.py
```

## 테스트 계정

- 아이디: admin
- 비밀번호: demo

## 문제 해결

### iOS 시뮬레이터 연결 안됨
- `.env`의 주소를 `http://localhost:5000`으로 설정

### Android 에뮬레이터 연결 안됨
- `.env`의 주소를 `http://10.0.2.2:5000`으로 설정

### 실제 디바이스 연결 안됨
- 컴퓨터와 디바이스가 같은 WiFi에 연결되어 있는지 확인
- 컴퓨터의 로컬 IP 주소를 확인하여 `.env`에 설정
- 방화벽에서 5000번 포트 허용

## 라이센스

Proprietary - All rights reserved

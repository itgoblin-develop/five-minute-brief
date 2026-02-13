// 웹 푸시 알림 유틸리티
import api from './api';

/**
 * 서비스 워커 등록
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker를 지원하지 않는 브라우저입니다');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker 등록 성공:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker 등록 실패:', error);
    return null;
  }
}

/**
 * VAPID 공개키를 서버에서 가져오기
 */
async function getVapidPublicKey(): Promise<string | null> {
  try {
    // 빌드 타임 환경변수 우선 사용
    const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (envKey) return envKey;

    // 없으면 서버에서 가져오기
    const res = await api.get('/api/push/vapid-public-key');
    if (res.data.success) return res.data.publicKey;
    return null;
  } catch {
    console.error('VAPID 공개키 가져오기 실패');
    return null;
  }
}

/**
 * Base64 URL → Uint8Array 변환 (pushManager.subscribe에 필요)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 푸시 알림 구독
 * - Notification.requestPermission() 호출
 * - pushManager.subscribe() 호출
 * - 서버에 구독 정보 전송
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    // 1. 브라우저 지원 체크
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push API를 지원하지 않는 브라우저입니다');
      return false;
    }

    // 2. 알림 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('알림 권한이 거부되었습니다');
      return false;
    }

    // 3. 서비스 워커 등록 확인
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = (await registerServiceWorker()) ?? undefined;
    }
    if (!registration) return false;

    // 서비스 워커 활성화 대기
    await navigator.serviceWorker.ready;

    // 4. VAPID 공개키 가져오기
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('VAPID 공개키를 가져올 수 없습니다');
      return false;
    }

    // 5. 기존 구독이 있으면 그대로 사용
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 6. 서버에 구독 정보 전송
    const subJson = subscription.toJSON();
    await api.post('/api/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
    });

    console.log('푸시 알림 구독 성공');
    return true;
  } catch (error) {
    console.error('푸시 알림 구독 실패:', error);
    return false;
  }
}

/**
 * 푸시 알림 구독 해제
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return true;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // 서버에도 해제 알림
      await api.delete('/api/push/unsubscribe', {
        data: { endpoint },
      });
    }

    console.log('푸시 알림 구독 해제 성공');
    return true;
  } catch (error) {
    console.error('푸시 알림 구독 해제 실패:', error);
    return false;
  }
}

/**
 * 현재 푸시 구독 상태 확인
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * 알림 권한 상태 확인
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

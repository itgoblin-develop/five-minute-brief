import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Bell, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { settingsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface SettingsProps {
  onLogout: () => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) {
  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={clsx(
        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        checked ? 'bg-blue-600' : 'bg-gray-200'
      )}
    >
      <span
        className={clsx(
          "inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm",
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

interface TimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTime: string;
  onSave: (time: string) => void;
}

function TimePickerSheet({ isOpen, onClose, initialTime, onSave }: TimePickerProps) {
  const [ampm, setAmpm] = useState('오전');
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const [h, m] = initialTime.split(':').map(Number);
      if (h === 0) { setAmpm('오전'); setHour(12); }
      else if (h === 12) { setAmpm('오후'); setHour(12); }
      else if (h > 12) { setAmpm('오후'); setHour(h - 12); }
      else { setAmpm('오전'); setHour(h); }
      setMinute(m);
    }
  }, [isOpen, initialTime]);

  const handleSave = () => {
    let h = hour;
    if (ampm === '오후' && h !== 12) h += 12;
    if (ampm === '오전' && h === 12) h = 0;
    const timeStr = `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onSave(timeStr);
    onClose();
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Auto-scroll logic could go here, but for simplicity we'll rely on click selection with auto-scroll to center
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-[101] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <span className="text-lg font-bold text-gray-900">시간 선택</span>
              <button 
                onClick={handleSave}
                className="text-blue-600 font-bold text-lg"
              >
                확인
              </button>
            </div>

            {/* Picker Content */}
            <div className="flex h-64 w-full relative">
              {/* Selection Indicator (Gray Bar) */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 bg-gray-100 -z-10 mx-4 rounded-lg pointer-events-none" />

              {/* AM/PM */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-[108px] text-center">
                {['오전', '오후'].map((p) => (
                   <div 
                     key={p}
                     onClick={() => setAmpm(p)}
                     className={clsx(
                       "h-10 flex items-center justify-center cursor-pointer transition-all",
                       ampm === p ? "text-gray-900 font-bold text-xl" : "text-gray-400 text-lg"
                     )}
                   >
                     {p}
                   </div>
                ))}
              </div>

              {/* Hours */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-[108px] text-center">
                 {hours.map((h) => (
                   <div 
                     key={h}
                     onClick={() => setHour(h)}
                     className={clsx(
                       "h-10 flex items-center justify-center cursor-pointer transition-all",
                       hour === h ? "text-gray-900 font-bold text-xl" : "text-gray-400 text-lg"
                     )}
                   >
                     {h}
                   </div>
                ))}
              </div>

              {/* Separator */}
              <div className="flex items-center justify-center pb-2 font-bold text-gray-900">:</div>

              {/* Minutes */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-[108px] text-center">
                 {minutes.map((m) => (
                   <div 
                     key={m}
                     onClick={() => setMinute(m)}
                     className={clsx(
                       "h-10 flex items-center justify-center cursor-pointer transition-all",
                       minute === m ? "text-gray-900 font-bold text-xl" : "text-gray-400 text-lg"
                     )}
                   >
                     {m.toString().padStart(2, '0')}
                   </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Settings({ onLogout }: SettingsProps) {
  const { isLoggedIn } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['월', '화', '수', '목', '금']);
  const [time, setTime] = useState('07:00');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 서버에서 설정 불러오기
  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }
    settingsAPI.get()
      .then((data) => {
        if (data.success && data.settings) {
          setPushEnabled(data.settings.push_enabled);
          setTime(data.settings.notification_time || '07:00');
          setSelectedDays(data.settings.notification_days || ['월', '화', '수', '목', '금']);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  // 설정 변경 시 서버에 저장
  const saveSettings = async (updates: { push_enabled?: boolean; notification_time?: string; notification_days?: string[] }) => {
    if (!isLoggedIn) return;
    try {
      await settingsAPI.update(updates);
    } catch {
      toast.error('설정 저장에 실패했습니다');
    }
  };

  const handlePushToggle = (enabled: boolean) => {
    setPushEnabled(enabled);
    saveSettings({ push_enabled: enabled });
  };

  const handleTimeSave = (newTime: string) => {
    setTime(newTime);
    saveSettings({ notification_time: newTime });
  };

  const toggleDay = (day: string) => {
    if (!pushEnabled) return;
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    saveSettings({ notification_days: newDays });
  };

  const formatDisplayTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    let ampm = '오전';
    let hour = h;
    if (h >= 12) {
      ampm = '오후';
      if (h > 12) hour = h - 12;
    }
    if (hour === 0) hour = 12;
    return `${ampm} ${hour}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white pt-16 px-5 pb-10 flex flex-col">
      <div className="flex-1">
        {/* Section Header */}
        <div className="mb-8 mt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">알림 설정</h2>
          <p className="text-gray-500 text-sm">
            중요한 뉴스를 놓치지 않게 알림을 받아보세요.
          </p>
        </div>

        {/* Push Toggle */}
        <div className="mb-8 flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div>
            <span className="block text-base font-bold text-gray-900">PUSH 알림</span>
            <span className="text-xs text-gray-500">매일 아침 뉴스를 배달해드려요</span>
          </div>
          <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
        </div>

        {/* Days & Time Settings (Disabled if push is off) */}
        <div className={clsx("transition-opacity duration-300", !pushEnabled && "opacity-40 pointer-events-none")}>
          {/* Days Selector */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center">
              <Bell size={16} className="mr-2 text-blue-600 fill-blue-600" />
              요일 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Picker Trigger */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center">
              <Clock size={16} className="mr-2 text-blue-600 fill-blue-600 text-white" />
              시간 설정
            </label>
            <button
              onClick={() => setIsTimePickerOpen(true)}
              disabled={!pushEnabled}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex items-center justify-between active:bg-gray-100 transition-colors"
            >
               <span className="text-lg font-bold text-gray-900">
                 {formatDisplayTime(time)}
               </span>
               <span className="text-blue-600 font-medium text-sm">
                 변경
               </span>
            </button>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="mt-auto">
        <p className="text-center text-xs text-gray-300 mt-4">
          버전 1.0.1
        </p>
      </div>

      <TimePickerSheet 
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        initialTime={time}
        onSave={handleTimeSave}
      />
    </div>
  );
}

// Шаги за сегодня из системного шагомера (expo-sensors).
// Возвращает null, если данные недоступны: в вебе, без разрешения,
// а также на Android, где история шагов за день системой не предоставляется.
import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export function useTodaySteps(): number | null {
  const [steps, setSteps] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const permission = await Pedometer.requestPermissionsAsync();
        if (!permission.granted) return;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (!cancelled) setSteps(result.steps);
      } catch {
        // нет данных — на экране останется прочерк
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return steps;
}

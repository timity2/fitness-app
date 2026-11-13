
import { API_BASE_URL, API_ENDPOINTS } from './api';

export async function fetchWorkouts(signal) {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.workouts}`,
    { method: 'GET', signal }
  );

  if (!response.ok) {
    throw new Error(`Ошибка сервера: ${response.status}`);
  }

  const result = await response.json();

  if (!Array.isArray(result.posts)) {
    throw new Error('Сервер вернул неверный формат данных');
  }

  return result.posts.map((post) => ({
    id: `api-${post.id}`,
    name: post.title,
    category: post.tags?.[0] || 'Fitness',
    level: 'Beginner',
    duration: 30,
    calories: 150,
    priority: 'medium',
    status: 'pending',
    image: null,
    exercises: [],
    trainer: null,
    location: null,
    statusHistory: [],
    createdAt: new Date().toISOString(),
  }));
}

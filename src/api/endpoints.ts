import { api } from './client';
import type {
  Activity,
  ActivityRequest,
  AuthResponse,
  Dashboard,
  DailyNutrition,
  Exercise,
  ExerciseHistoryPoint,
  ExerciseRequest,
  ExternalFood,
  Food,
  FoodRequest,
  GenerateRoutineRequest,
  LeaderboardEntry,
  Meal,
  MealItem,
  MealItemRequest,
  MealNutrition,
  MessageResponse,
  NutritionGoal,
  NutritionGoalRequest,
  Page,
  Progress,
  Routine,
  RoutineExerciseRequest,
  RoutineRequest,
  StartedWorkout,
  Streak,
  StrengthProfile,
  Task,
  TaskRequest,
  User,
  UserRequest,
  WaterDay,
  WeeklyLeaderboardEntry,
  WeightEntry,
  WeightHistory,
  Workout,
  WorkoutExercise,
  WorkoutRequest,
  WorkoutSet,
  WorkoutSetRequest,
} from './types';

export const authApi = {
  login: (email: string, password: string) => api.publicPost<AuthResponse>('/auth/login', { email, password }),
  register: (data: UserRequest) => api.publicPost<AuthResponse>('/auth/register', data),
  refresh: (refreshToken: string) => api.publicPost<AuthResponse>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.publicPost<void>('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.publicPost<MessageResponse>('/auth/forgot-password', { email }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.publicPost<void>('/auth/reset-password', { email, code, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<AuthResponse>('/auth/change-password', { currentPassword, newPassword }),
  me: () => api.get<User>('/auth/me'),
};

export const userApi = {
  dashboard: (userId: number, date?: string) => api.get<Dashboard>(`/users/${userId}/dashboard`, { date }),
  get: (userId: number) => api.get<User>(`/users/${userId}`),
  update: (userId: number, data: UserRequest) => api.patch<User>(`/users/${userId}`, data),
  remove: (userId: number) => api.del(`/users/${userId}`),
  uploadPhoto: (userId: number, form: FormData) => api.upload<User>(`/users/${userId}/photo`, form),
  removePhoto: (userId: number) => api.del(`/users/${userId}/photo`),
  progress: (userId: number) => api.get<Progress>(`/users/${userId}/progress`),
  updateCategory: (userId: number, category: string) =>
    api.patch<Progress>(`/users/${userId}/progress/category`, { category }),
};

export const taskApi = {
  all: (userId: number) => api.get<Task[]>(`/users/${userId}/tasks`),
  forDate: (userId: number, date: string) => api.get<Task[]>(`/users/${userId}/tasks`, { date }),
  today: (userId: number) => api.get<Task[]>(`/users/${userId}/tasks/today`),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (userId: number, data: TaskRequest) => api.post<Task>(`/users/${userId}/tasks`, data),
  update: (id: number, data: TaskRequest) => api.patch<Task>(`/tasks/${id}`, data),
  remove: (id: number) => api.del(`/tasks/${id}`),
  complete: (id: number, date?: string) => api.patch<Task>(`/tasks/${id}/complete`, undefined, { date }),
  uncomplete: (id: number, date?: string) => api.patch<Task>(`/tasks/${id}/uncomplete`, undefined, { date }),
};

export const activityApi = {
  list: (userId: number) => api.get<Activity[]>(`/users/${userId}/activities`),
  get: (id: number) => api.get<Activity>(`/activities/${id}`),
  create: (userId: number, data: ActivityRequest) => api.post<Activity>(`/users/${userId}/activities`, data),
  update: (id: number, data: ActivityRequest) => api.patch<Activity>(`/activities/${id}`, data),
  remove: (id: number) => api.del(`/activities/${id}`),
};

export const foodApi = {
  search: (name?: string, page = 0, size = 20) => api.get<Page<Food>>('/foods', { name, page, size }),
  get: (id: number) => api.get<Food>(`/foods/${id}`),
  create: (data: FoodRequest) => api.post<Food>('/foods', data),
  update: (id: number, data: FoodRequest) => api.patch<Food>(`/foods/${id}`, data),
  remove: (id: number) => api.del(`/foods/${id}`),
  external: (q: string) => api.get<ExternalFood[]>('/foods/external', { q }),
  barcode: (code: string) => api.post<Food>(`/foods/barcode/${encodeURIComponent(code)}`),
};

export const mealApi = {
  list: (userId: number, date?: string) => api.get<Meal[]>(`/users/${userId}/meals`, { date }),
  create: (userId: number, data: { name?: string; date?: string }) => api.post<Meal>(`/users/${userId}/meals`, data),
  get: (id: number) => api.get<Meal>(`/meals/${id}`),
  update: (id: number, data: { name?: string; date?: string }) => api.patch<Meal>(`/meals/${id}`, data),
  remove: (id: number) => api.del(`/meals/${id}`),
  nutrition: (id: number) => api.get<MealNutrition>(`/meals/${id}/nutrition`),
  items: (id: number) => api.get<MealItem[]>(`/meals/${id}/items`),
  addItem: (id: number, data: MealItemRequest) => api.post<MealItem>(`/meals/${id}/items`, data),
  updateItem: (itemId: number, data: MealItemRequest) => api.patch<MealItem>(`/meal-items/${itemId}`, data),
  removeItem: (itemId: number) => api.del(`/meal-items/${itemId}`),
};

export const goalApi = {
  get: (userId: number) => api.get<NutritionGoal>(`/users/${userId}/goals`),
  update: (userId: number, data: NutritionGoalRequest) => api.patch<NutritionGoal>(`/users/${userId}/goals`, data),
  daily: (userId: number, date?: string) => api.get<DailyNutrition>(`/users/${userId}/nutrition/daily`, { date }),
};

export const trackingApi = {
  water: (userId: number, date?: string) => api.get<WaterDay>(`/users/${userId}/water`, { date }),
  addWater: (userId: number, amountMl: number, date?: string) =>
    api.post<WaterDay>(`/users/${userId}/water`, { amountMl, date }),
  removeWater: (id: number) => api.del(`/water/${id}`),
  weights: (userId: number, from?: string, to?: string) =>
    api.get<WeightHistory>(`/users/${userId}/weights`, { from, to }),
  addWeight: (userId: number, weightKg: number, date?: string) =>
    api.post<WeightEntry>(`/users/${userId}/weights`, { weightKg, date }),
  removeWeight: (id: number) => api.del(`/weights/${id}`),
};

export const exerciseApi = {
  search: (params: { name?: string; muscleGroup?: string; page?: number; size?: number }) =>
    api.get<Page<Exercise>>('/exercises', params),
  ranked: () => api.get<Exercise[]>('/exercises/ranked'),
  get: (id: number) => api.get<Exercise>(`/exercises/${id}`),
  create: (data: ExerciseRequest) => api.post<Exercise>('/exercises', data),
  update: (id: number, data: ExerciseRequest) => api.patch<Exercise>(`/exercises/${id}`, data),
  remove: (id: number) => api.del(`/exercises/${id}`),
};

export const routineApi = {
  list: (userId: number) => api.get<Routine[]>(`/users/${userId}/routines`),
  create: (userId: number, data: RoutineRequest) => api.post<Routine>(`/users/${userId}/routines`, data),
  generate: (userId: number, data: GenerateRoutineRequest) =>
    api.post<Routine[]>(`/users/${userId}/routines/generate`, data),
  get: (id: number) => api.get<Routine>(`/routines/${id}`),
  update: (id: number, data: RoutineRequest) => api.patch<Routine>(`/routines/${id}`, data),
  remove: (id: number) => api.del(`/routines/${id}`),
  start: (id: number, date?: string) => api.post<StartedWorkout>(`/routines/${id}/start`, date ? { date } : {}),
  addExercise: (id: number, data: RoutineExerciseRequest) => api.post<Routine>(`/routines/${id}/exercises`, data),
  updateExercise: (itemId: number, data: RoutineExerciseRequest) =>
    api.patch<Routine>(`/routine-exercises/${itemId}`, data),
  removeExercise: (itemId: number) => api.del<Routine>(`/routine-exercises/${itemId}`),
};

export const workoutApi = {
  list: (userId: number) => api.get<Workout[]>(`/users/${userId}/workouts`),
  create: (userId: number, data: WorkoutRequest) => api.post<Workout>(`/users/${userId}/workouts`, data),
  get: (id: number) => api.get<Workout>(`/workouts/${id}`),
  update: (id: number, data: WorkoutRequest) => api.patch<Workout>(`/workouts/${id}`, data),
  remove: (id: number) => api.del(`/workouts/${id}`),
  exercises: (id: number) => api.get<WorkoutExercise[]>(`/workouts/${id}/exercises`),
  addExercise: (id: number, exerciseId: number) =>
    api.post<WorkoutExercise>(`/workouts/${id}/exercises`, { exerciseId }),
  swapExercise: (itemId: number, exerciseId: number) =>
    api.patch<WorkoutExercise>(`/workout-exercises/${itemId}`, { exerciseId }),
  removeExercise: (itemId: number) => api.del(`/workout-exercises/${itemId}`),
  sets: (itemId: number) => api.get<WorkoutSet[]>(`/workout-exercises/${itemId}/sets`),
  addSet: (itemId: number, data: WorkoutSetRequest) => api.post<WorkoutSet>(`/workout-exercises/${itemId}/sets`, data),
  updateSet: (setId: number, data: WorkoutSetRequest) => api.patch<WorkoutSet>(`/workout-sets/${setId}`, data),
  removeSet: (setId: number) => api.del(`/workout-sets/${setId}`),
};

export const strengthApi = {
  profile: (userId: number) => api.get<StrengthProfile>(`/users/${userId}/strength`),
  history: (userId: number, exerciseId: number) =>
    api.get<ExerciseHistoryPoint[]>(`/users/${userId}/exercises/${exerciseId}/history`),
  streak: (userId: number) => api.get<Streak>(`/users/${userId}/streak`),
  leaderboard: (limit = 50) => api.get<LeaderboardEntry[]>('/leaderboard', { limit }),
  weekly: (limit = 50) => api.get<WeeklyLeaderboardEntry[]>('/leaderboard/weekly', { limit }),
};

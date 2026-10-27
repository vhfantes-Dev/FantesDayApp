// Tipos das respostas e requisições da FantesDay API (espelham os DTOs Java).
// Datas: LocalDate = "yyyy-MM-dd", LocalTime = "HH:mm:ss", LocalDateTime/Instant = ISO.
// BigDecimal chega como number.

export type Sex = 'MALE' | 'FEMALE';
export type CatalogSource = 'TACO' | 'OPEN_FOOD_FACTS' | 'FREE_EXERCISE_DB' | 'WGER' | 'CUSTOM';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type WeightGoal = 'LOSE' | 'MAINTAIN' | 'GAIN';
export type FoodUnit = 'g' | 'ml';
export type StrengthRank =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER'
  | 'OLYMPIAN';
export type TrainingGoal = 'STRENGTH' | 'HYPERTROPHY' | 'ENDURANCE';
export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EquipmentType = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  faceIdEnabled: boolean | null;
  bodyweightKg: number | null;
  sex: Sex | null;
  heightCm: number | null;
  birthDate: string | null;
  activityLevel: ActivityLevel | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface UserRequest {
  name?: string;
  email?: string;
  password?: string;
  faceIdEnabled?: boolean;
  bodyweightKg?: number;
  sex?: Sex;
  heightCm?: number;
  birthDate?: string;
  activityLevel?: ActivityLevel;
}

// TMB, gasto diário e IMC. Os cálculos ficam null enquanto faltar dado (veja missingFields).
export interface BodyMetrics {
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  activityFactor: number | null;
  bmi: number | null;
  bmiCategory: string | null;
  bmr: number | null;
  tdee: number | null;
  suggestedCalories: { lose: number; maintain: number; gain: number } | null;
  suggestedProteinG: number | null;
  complete: boolean;
  missingFields: string[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface Progress {
  userId: number;
  totalXp: number;
  level: number;
  category: string | null;
  updatedAt: string;
}

export interface Rank {
  score: number;
  rank: StrengthRank;
  lp: number;
  nextRank: StrengthRank | null;
}

export interface Streak {
  currentStreakDays: number;
  longestStreakDays: number;
  workoutsInCurrentStreak: number;
  active: boolean;
  lastWorkoutDate: string | null;
  expiresOn: string | null;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  type: string | null;
  date: string | null;
  time: string | null;
  weekDays: string | null;
  recurring: boolean;
  referenceDate: string;
  completed: boolean;
  completedAt: string | null;
}

export interface TaskRequest {
  title?: string;
  type?: string;
  date?: string | null;
  time?: string | null;
  weekDays?: string | null;
}

export interface MealNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionGoal {
  userId: number;
  dailyCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  dailyWaterMl: number | null;
  updatedAt: string | null;
}

export interface NutritionGoalRequest {
  dailyCalories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  dailyWaterMl?: number;
}

export interface NutritionRemaining {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface DailyNutrition {
  date: string;
  consumed: MealNutrition;
  goal: NutritionGoal;
  remaining: NutritionRemaining;
  caloriesPercent: number | null;
}

export interface WaterEntry {
  id: number;
  date: string;
  amountMl: number;
  createdAt: string;
}

export interface WaterDay {
  date: string;
  totalMl: number;
  goalMl: number | null;
  percent: number | null;
  entries: WaterEntry[];
}

export interface Dashboard {
  date: string;
  user: User;
  progress: {
    totalXp: number;
    level: number;
    xpToNextLevel: number;
    levelProgressPercent: number;
    category: string | null;
  };
  streak: Streak;
  tasks: { total: number; completed: number; items: Task[] };
  nutrition: DailyNutrition;
  water: WaterDay;
  activities: { count: number; totalMinutes: number; caloriesBurned: number };
  strengthRank: Rank | null;
  // target = meta (ou gasto diário); remaining = target + gasto nas atividades − consumido
  calories: {
    target: number | null;
    targetSource: string | null;
    consumed: number;
    burnedByActivities: number;
    remaining: number | null;
  };
  workouts: { today: Workout[]; thisWeek: number };
  bodyMetrics: BodyMetrics;
  weight: { currentKg: number | null; changeLast30Days: number | null; lastEntryDate: string | null };
}

export interface Activity {
  id: number;
  userId: number;
  activityType: string;
  durationMinutes: number | null;
  origin: string | null;
  importSource: string | null;
  externalId: string | null;
  caloriesBurned: number | null;
  date: string;
  xpEarned: number | null;
}

export interface ActivityRequest {
  activityType?: string;
  durationMinutes?: number;
  origin?: string;
  caloriesBurned?: number;
  date?: string;
}

export interface Food {
  id: number;
  name: string;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
  defaultUnit: string | null;
  liquid: boolean;
  densityGPerMl: number | null;
  source: CatalogSource;
  externalId: string | null;
  createdById: number | null;
}

export interface FoodRequest {
  name?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  defaultUnit?: string;
  liquid?: boolean;
  densityGPerMl?: number;
}

export interface ExternalFood {
  barcode: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

export interface Meal {
  id: number;
  userId: number;
  name: string;
  date: string;
  createdAt: string;
}

export interface MealItem {
  id: number;
  mealId: number;
  foodId: number;
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  // Quantidade usada no cálculo (ml × densidade do alimento)
  quantityInGrams: number;
  calculatedCalories: number;
  calculatedProtein: number;
  calculatedCarbs: number;
  calculatedFat: number;
}

export interface MealItemRequest {
  foodId?: number;
  quantity?: number;
  unit?: FoodUnit;
}

export interface WeightEntry {
  id: number;
  date: string;
  weightKg: number;
}

export interface WeightHistory {
  from: string;
  to: string;
  currentWeightKg: number | null;
  changeKg: number | null;
  entries: WeightEntry[];
}

export interface Exercise {
  id: number;
  // name em português; nameEn com o nome original
  name: string;
  nameEn: string | null;
  // "pt" ou "en"
  instructionsLanguage: string | null;
  muscleGroup: string | null;
  secondaryMuscles: string | null;
  equipment: string | null;
  level: string | null;
  category: string | null;
  instructions: string | null;
  imageUrl: string | null;
  source: CatalogSource;
  createdById: number | null;
}

export interface ExerciseRequest {
  name?: string;
  muscleGroup?: string;
  secondaryMuscles?: string;
  equipment?: string;
  level?: string;
  category?: string;
  instructions?: string;
  imageUrl?: string;
}

export interface RoutineExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  position: number;
  targetSets: number | null;
  targetReps: string | null;
  restSeconds: number | null;
}

export interface RoutineExerciseRequest {
  exerciseId?: number;
  targetSets?: number;
  targetReps?: string;
  restSeconds?: number;
  position?: number;
}

export interface Routine {
  id: number | null;
  userId: number;
  name: string;
  notes: string | null;
  exercises: RoutineExercise[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RoutineRequest {
  name?: string;
  notes?: string;
  exercises?: RoutineExerciseRequest[];
}

export interface GenerateRoutineRequest {
  goal: TrainingGoal;
  daysPerWeek: number;
  level: TrainingLevel;
  equipment: EquipmentType[];
  save: boolean;
}

export interface Workout {
  id: number;
  userId: number;
  workoutType: string;
  date: string;
  xpEarned: number | null;
}

export interface WorkoutRequest {
  workoutType?: string;
  date?: string;
  xpEarned?: number;
}

export interface StartedWorkout {
  workout: Workout;
  exercises: {
    workoutExerciseId: number;
    exerciseId: number;
    exerciseName: string;
    targetSets: number | null;
    targetReps: string | null;
    restSeconds: number | null;
  }[];
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  exerciseName: string;
}

export interface ExerciseRank {
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  bestOneRepMax: number | null;
  bodyweightRatio: number | null;
  rank: Rank;
}

export interface WorkoutSet {
  id: number;
  workoutExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  reps: number;
  weightKg: number | null;
  estimatedOneRepMax: number | null;
  personalRecord: boolean | null;
  createdAt: string;
  rank: ExerciseRank | null;
}

export interface WorkoutSetRequest {
  reps?: number;
  weightKg?: number | null;
}

export interface MuscleRank {
  muscleGroup: string;
  rankedExercises: number;
  rank: Rank;
}

export interface StrengthProfile {
  userId: number;
  bodyweightKg: number | null;
  sex: Sex | null;
  overall: Rank | null;
  muscles: MuscleRank[];
  exercises: ExerciseRank[];
}

export interface ExerciseHistoryPoint {
  date: string;
  bestOneRepMax: number | null;
  volumeKg: number | null;
}

export interface LeaderboardEntry {
  position: number;
  userId: number;
  name: string;
  score: number;
  rank: StrengthRank;
}

export interface WeeklyLeaderboardEntry {
  position: number;
  userId: number;
  name: string;
  volumeKg: number;
  workouts: number;
}

export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  instance?: string;
}

export interface ActivityImportRequest {
  source: string;
  activities: {
    externalId: string;
    activityType: string;
    durationMinutes: number;
    caloriesBurned?: number;
    date: string;
  }[];
}

export interface ActivityImportResult {
  imported: number;
  skipped: number;
  xpEarned: number;
  activities: Activity[];
}

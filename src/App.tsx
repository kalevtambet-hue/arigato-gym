import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HistoryPage } from './features/history/HistoryPage';
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage';
import { ExercisesListPage } from './features/exercises/ExercisesListPage';
import { KavadPage } from './features/plans/KavadPage';
import { WorkoutDayDetailPage } from './features/plans/WorkoutDayDetailPage';
import { MorePage } from './features/more/MorePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { WorkoutPage } from './features/workout/WorkoutPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/treening" replace />} />
        <Route path="/treening" element={<WorkoutPage />} />
        <Route path="/kavad" element={<KavadPage />} />
        <Route path="/kavad/:dayId" element={<WorkoutDayDetailPage />} />
        <Route path="/harjutused" element={<ExercisesListPage />} />
        <Route path="/harjutused/:exerciseId" element={<ExerciseDetailPage />} />
        <Route path="/ajalugu" element={<HistoryPage />} />
        <Route path="/rohkem" element={<MorePage />} />
        <Route path="/seaded" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

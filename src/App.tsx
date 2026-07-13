import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExercisesPage } from './features/exercises/ExercisesPage';
import { HistoryPage } from './features/history/HistoryPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { WorkoutPage } from './features/workout/WorkoutPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/harjutused" replace />} />
        <Route path="/harjutused" element={<ExercisesPage />} />
        <Route path="/treening" element={<WorkoutPage />} />
        <Route path="/ajalugu" element={<HistoryPage />} />
        <Route path="/seaded" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { FriendProfilePage } from '@/features/friends/FriendProfilePage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { EditHabitPage } from '@/features/habits/EditHabitPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { NewHabitPage } from '@/features/habits/NewHabitPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { RemindersPage } from '@/features/reminders/RemindersPage'
import { AchievementsPage } from '@/features/rewards/AchievementsPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { StatusPage } from '@/features/system/StatusPage'
import { AppLayout } from './AppLayout'

// Mapa de la app: cada dirección (URL) muestra una pantalla.
// - /login y /estado son públicas.
// - Todo lo demás está dentro de <RequireAuth />: hay que haber iniciado sesión.
export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="estado" element={<StatusPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<DashboardPage />} />
            <Route path="habitos" element={<HabitsPage />} />
            <Route path="habitos/nuevo" element={<NewHabitPage />} />
            <Route path="habitos/:id/editar" element={<EditHabitPage />} />
            <Route path="habitos/recordatorios" element={<RemindersPage />} />
            <Route path="amigos" element={<FriendsPage />} />
            <Route path="amigos/:id" element={<FriendProfilePage />} />
            <Route path="logros" element={<AchievementsPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="perfil/estadisticas" element={<StatsPage />} />
            {/* Direcciones antiguas (avisos al móvil, enlaces guardados) */}
            <Route path="recordatorios" element={<Navigate to="/habitos/recordatorios" replace />} />
            <Route path="estadisticas" element={<Navigate to="/perfil/estadisticas" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

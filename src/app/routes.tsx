import { Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { lazyPage, preloadPages } from '@/lib/lazyPage'
import { AppLayout } from './AppLayout'

// Pantallas que no se ven al abrir la app: se descargan solo cuando hacen falta (la app arranca antes en el móvil)
const FriendProfilePage = lazyPage(() => import('@/features/friends/FriendProfilePage'), 'FriendProfilePage')
const EditHabitPage = lazyPage(() => import('@/features/habits/EditHabitPage'), 'EditHabitPage')
const NewHabitPage = lazyPage(() => import('@/features/habits/NewHabitPage'), 'NewHabitPage')
const RemindersPage = lazyPage(() => import('@/features/reminders/RemindersPage'), 'RemindersPage')
const AchievementsPage = lazyPage(() => import('@/features/rewards/AchievementsPage'), 'AchievementsPage')
const StatsPage = lazyPage(() => import('@/features/stats/StatsPage'), 'StatsPage')
const StatusPage = lazyPage(() => import('@/features/system/StatusPage'), 'StatusPage')

// Mapa de la app: cada dirección (URL) muestra una pantalla.
// - /login y /estado son públicas.
// - Todo lo demás está dentro de <RequireAuth />: hay que haber iniciado sesión.
preloadPages()

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

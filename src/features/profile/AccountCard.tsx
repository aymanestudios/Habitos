import { Card } from '@/components/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProfile } from './useProfile'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate font-semibold">{value}</span>
    </div>
  )
}

// Datos REALES de la cuenta (el resto de la pantalla de Perfil sigue siendo diseño de ejemplo).
export function AccountCard() {
  const { user, signOut } = useAuth()
  const profile = useProfile()

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">Tu cuenta</h2>

      {profile.isPending && <p className="py-3 text-muted">Cargando...</p>}

      {profile.isError && (
        <p className="py-3 text-sm text-danger">
          No se pudo cargar tu perfil. ¿Has ejecutado la migración 0001_profiles.sql en Supabase?
        </p>
      )}

      {profile.data && (
        <div className="divide-y divide-line">
          <Row label="Nombre" value={profile.data.display_name} />
          <Row label="Usuario" value={`@${profile.data.username}`} />
          <Row label="Email" value={user?.email ?? ''} />
          <Row label="Zona horaria" value={profile.data.timezone} />
        </div>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 w-full rounded-2xl border border-line px-4 py-3 font-semibold transition-colors hover:bg-surface-2"
      >
        Cerrar sesión
      </button>
    </Card>
  )
}

import { Card } from './Card'
import { PageHeader } from './PageHeader'

// Pantalla provisional para rutas que aún no existen
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Card>
        <p className="text-muted">{text}</p>
      </Card>
    </div>
  )
}

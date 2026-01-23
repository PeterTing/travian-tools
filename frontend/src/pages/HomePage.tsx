import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('home.title')}</h1>
        <p className="text-lg text-muted-foreground">
          {t('home.subtitle')}
        </p>
      </header>

      <main className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{t('home.troopCalculator.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('home.troopCalculator.description')}
          </p>
          <Button variant="outline">{t('common.comingSoon')}</Button>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{t('home.resourcePlanner.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('home.resourcePlanner.description')}
          </p>
          <Button variant="outline">{t('common.comingSoon')}</Button>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{t('home.battleSimulator.title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('home.battleSimulator.description')}
          </p>
          <Button variant="outline">{t('common.comingSoon')}</Button>
        </div>
      </main>
    </div>
  )
}

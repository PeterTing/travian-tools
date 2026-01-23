import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold mb-4">{t('notFound.title')}</h1>
      <p className="text-xl text-muted-foreground mb-8">
        {t('notFound.message')}
      </p>
      <Link to="/">
        <Button>{t('common.backToHome')}</Button>
      </Link>
    </div>
  )
}

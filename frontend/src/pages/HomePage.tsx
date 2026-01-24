import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface FeatureCardProps {
  title: string
  description: string
  href: string
  available: boolean
}

function FeatureCard({ title, description, href, available }: FeatureCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter>
        {available ? (
          <Link to={href} className="w-full">
            <Button className="w-full">{t('home.viewNow')}</Button>
          </Link>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            {t('common.comingSoon')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function HomePage() {
  const { t } = useTranslation()

  const databaseFeatures = [
    {
      title: t('nav.buildings'),
      description: t('home.features.buildings'),
      href: '/database/buildings',
      available: true,
    },
    {
      title: t('nav.troops'),
      description: t('home.features.troops'),
      href: '/database/troops',
      available: true,
    },
    {
      title: t('nav.resources'),
      description: t('home.features.resources'),
      href: '/database/resources',
      available: true,
    },
  ]

  const calculatorFeatures = [
    {
      title: t('nav.buildingCalc'),
      description: t('home.features.buildingCalc'),
      href: '/calculator/building',
      available: true,
    },
    {
      title: t('nav.roiCalc'),
      description: t('home.features.roiCalc'),
      href: '/calculator/roi',
      available: true,
    },
    {
      title: t('nav.battleSim'),
      description: t('home.features.battleSim'),
      href: '/calculator/battle',
      available: true,
    },
    {
      title: t('nav.cropBalance'),
      description: t('home.features.cropBalance'),
      href: '/calculator/crop',
      available: true,
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('home.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('home.subtitle')}</p>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">{t('nav.database')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databaseFeatures.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">{t('nav.calculator')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculatorFeatures.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </div>
      </section>
    </div>
  )
}

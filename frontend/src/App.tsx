import { Routes, Route, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
// Database pages
import BuildingsPage from '@/pages/database/BuildingsPage'
import TroopsPage from '@/pages/database/TroopsPage'
import ResourcesPage from '@/pages/database/ResourcesPage'
// Calculator pages
import BuildingCalculatorPage from '@/pages/calculator/BuildingCalculatorPage'
import RoiCalculatorPage from '@/pages/calculator/RoiCalculatorPage'
import BattleSimulatorPage from '@/pages/calculator/BattleSimulatorPage'
import CropBalancePage from '@/pages/calculator/CropBalancePage'

function Navigation() {
  const { t } = useTranslation()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14 gap-6">
          <Link to="/" className="font-bold text-lg">
            {t('nav.title')}
          </Link>
          <div className="flex gap-4 text-sm">
            <div className="relative group">
              <span className="cursor-pointer hover:text-primary">
                {t('nav.database')}
              </span>
              <div className="absolute top-full left-0 hidden group-hover:block bg-background border rounded shadow-lg py-2 min-w-[120px] z-50">
                <Link
                  to="/database/buildings"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.buildings')}
                </Link>
                <Link
                  to="/database/troops"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.troops')}
                </Link>
                <Link
                  to="/database/resources"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.resources')}
                </Link>
              </div>
            </div>
            <div className="relative group">
              <span className="cursor-pointer hover:text-primary">
                {t('nav.calculator')}
              </span>
              <div className="absolute top-full left-0 hidden group-hover:block bg-background border rounded shadow-lg py-2 min-w-[140px] z-50">
                <Link
                  to="/calculator/building"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.buildingCalc')}
                </Link>
                <Link
                  to="/calculator/roi"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.roiCalc')}
                </Link>
                <Link
                  to="/calculator/battle"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.battleSim')}
                </Link>
                <Link
                  to="/calculator/crop"
                  className="block px-4 py-2 hover:bg-muted"
                >
                  {t('nav.cropBalance')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Database routes */}
        <Route path="/database/buildings" element={<BuildingsPage />} />
        <Route path="/database/troops" element={<TroopsPage />} />
        <Route path="/database/resources" element={<ResourcesPage />} />
        {/* Calculator routes */}
        <Route path="/calculator/building" element={<BuildingCalculatorPage />} />
        <Route path="/calculator/roi" element={<RoiCalculatorPage />} />
        <Route path="/calculator/battle" element={<BattleSimulatorPage />} />
        <Route path="/calculator/crop" element={<CropBalancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App

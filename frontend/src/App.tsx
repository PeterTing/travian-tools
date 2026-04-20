import { Routes, Route, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { RequireAuth } from '@/components/auth'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'
// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
// Database pages
import BuildingsPage from '@/pages/database/BuildingsPage'
import TroopsPage from '@/pages/database/TroopsPage'
import ResourcesPage from '@/pages/database/ResourcesPage'
// Calculator pages
import BuildingCalculatorPage from '@/pages/calculator/BuildingCalculatorPage'
import RoiCalculatorPage from '@/pages/calculator/RoiCalculatorPage'
import BattleSimulatorPage from '@/pages/calculator/BattleSimulatorPage'
import CropBalancePage from '@/pages/calculator/CropBalancePage'
// Advanced calculator pages
import PathCalculatorPage from '@/pages/calculator/PathCalculatorPage'
import InterceptionCalculatorPage from '@/pages/calculator/InterceptionCalculatorPage'
import CulturePointsCalculatorPage from '@/pages/calculator/CulturePointsCalculatorPage'
import TechnologyCalculatorPage from '@/pages/calculator/TechnologyCalculatorPage'
import NpcCalculatorPage from '@/pages/calculator/NpcCalculatorPage'
import SaveTroopsCalculatorPage from '@/pages/calculator/SaveTroopsCalculatorPage'
import PathSpeedTsCalculatorPage from '@/pages/calculator/PathSpeedTsCalculatorPage'
// Phase 1 new calculators (2026-04)
import VillageBuilderPage from '@/pages/calculator/VillageBuilderPage'
import CropScouterPage from '@/pages/calculator/CropScouterPage'
import AttackPlannerPage from '@/pages/calculator/AttackPlannerPage'
// Game accounts page
import { GameAccountsPage } from '@/pages/game-accounts'
// Village pages
import VillagesPage from '@/pages/villages/VillagesPage'
import VillageDetailPage from '@/pages/villages/VillageDetailPage'
// DashboardPage removed — village management is now unified in VillagesPage
// Map pages
import MapSqlPage from '@/pages/map/MapSqlPage'
// Statistics pages
import {
  ServerOverviewPage,
  PlayerRankingPage,
  AllianceRankingPage,
  ConquestActivityPage,
  NameChangesPage,
  InactiveSearchPage,
} from '@/pages/statistics'
// Strategy pages
import { AIAdvisorPage, HealthCheckPage } from '@/pages/strategy'
import { Button } from '@/components/ui/button'

function Navigation() {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
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
                  <hr className="my-1 border-muted" />
                  <Link
                    to="/calculator/path"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    路徑計算器
                  </Link>
                  <Link
                    to="/calculator/interception"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    攔截計算器
                  </Link>
                  <Link
                    to="/calculator/culture-points"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    文化點計算器
                  </Link>
                  <Link
                    to="/calculator/technology"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    科技計算器
                  </Link>
                  <Link
                    to="/calculator/npc"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    NPC 計算器
                  </Link>
                  <Link
                    to="/calculator/save-troops"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    避兵計算器
                  </Link>
                  <Link
                    to="/calculator/path-speed-ts"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    TS 反推計算器
                  </Link>
                  <Link
                    to="/calculator/village-builder"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    最佳建造順序
                  </Link>
                  <Link
                    to="/calculator/crop-scouter"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    首都類型反推
                  </Link>
                  <Link
                    to="/calculator/attack-planner"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    攻擊規劃器
                  </Link>
                </div>
              </div>
              <div className="relative group">
                <span className="cursor-pointer hover:text-primary">
                  統計
                </span>
                <div className="absolute top-full left-0 hidden group-hover:block bg-background border rounded shadow-lg py-2 min-w-[140px] z-50">
                  <Link
                    to="/statistics/overview"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    伺服器總覽
                  </Link>
                  <Link
                    to="/statistics/players"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    玩家排名
                  </Link>
                  <Link
                    to="/statistics/alliances"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    聯盟排名
                  </Link>
                  <Link
                    to="/statistics/conquests"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    征服記錄
                  </Link>
                  <Link
                    to="/statistics/name-changes"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    改名記錄
                  </Link>
                  <Link
                    to="/statistics/search/inactives"
                    className="block px-4 py-2 hover:bg-muted"
                  >
                    不活躍搜尋
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/game-accounts">
                  <Button variant="ghost" size="sm">
                    {t('gameAccounts.title')}
                  </Button>
                </Link>
                <Link to="/villages">
                  <Button variant="ghost" size="sm">
                    {t('villages.title')}
                  </Button>
                </Link>
                <Link to="/map-sql">
                  <Button variant="ghost" size="sm">
                    {t('mapSql.title')}
                  </Button>
                </Link>
                <div className="relative group">
                  <Button variant="ghost" size="sm">
                    {t('nav.strategy')}
                  </Button>
                  <div className="absolute top-full right-0 hidden group-hover:block bg-background border rounded shadow-lg py-2 min-w-[140px] z-50">
                    <Link
                      to="/strategy/advisor"
                      className="block px-4 py-2 hover:bg-muted"
                    >
                      {t('nav.aiAdvisor')}
                    </Link>
                    <Link
                      to="/strategy/health-check"
                      className="block px-4 py-2 hover:bg-muted"
                    >
                      {t('nav.healthCheck')}
                    </Link>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {user?.username}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  {t('auth.logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    {t('auth.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">{t('auth.register')}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Database routes */}
        <Route path="/database/buildings" element={<BuildingsPage />} />
        <Route path="/database/troops" element={<TroopsPage />} />
        <Route path="/database/resources" element={<ResourcesPage />} />
        {/* Calculator routes */}
        <Route path="/calculator/building" element={<BuildingCalculatorPage />} />
        <Route path="/calculator/roi" element={<RoiCalculatorPage />} />
        <Route path="/calculator/battle" element={<BattleSimulatorPage />} />
        <Route path="/calculator/crop" element={<CropBalancePage />} />
        {/* Advanced calculator routes */}
        <Route path="/calculator/path" element={<PathCalculatorPage />} />
        <Route path="/calculator/interception" element={<InterceptionCalculatorPage />} />
        <Route path="/calculator/culture-points" element={<CulturePointsCalculatorPage />} />
        <Route path="/calculator/technology" element={<TechnologyCalculatorPage />} />
        <Route path="/calculator/npc" element={<NpcCalculatorPage />} />
        <Route path="/calculator/save-troops" element={<SaveTroopsCalculatorPage />} />
        <Route path="/calculator/path-speed-ts" element={<PathSpeedTsCalculatorPage />} />
        {/* Phase 1 new calculators */}
        <Route path="/calculator/village-builder" element={<VillageBuilderPage />} />
        <Route path="/calculator/crop-scouter" element={<CropScouterPage />} />
        <Route path="/calculator/attack-planner" element={<AttackPlannerPage />} />
        {/* Statistics routes - 公開 */}
        <Route path="/statistics/overview" element={<ServerOverviewPage />} />
        <Route path="/statistics/players" element={<PlayerRankingPage />} />
        <Route path="/statistics/alliances" element={<AllianceRankingPage />} />
        <Route path="/statistics/conquests" element={<ConquestActivityPage />} />
        <Route path="/statistics/name-changes" element={<NameChangesPage />} />
        <Route path="/statistics/search/inactives" element={<InactiveSearchPage />} />
        {/* Protected routes - 需要登入 */}
        <Route path="/game-accounts" element={<RequireAuth><GameAccountsPage /></RequireAuth>} />
        <Route path="/villages" element={<RequireAuth><VillagesPage /></RequireAuth>} />
        <Route path="/villages/:villageId" element={<RequireAuth><VillageDetailPage /></RequireAuth>} />
        <Route path="/map-sql" element={<RequireAuth><MapSqlPage /></RequireAuth>} />
        {/* Strategy routes */}
        <Route path="/strategy/advisor" element={<RequireAuth><AIAdvisorPage /></RequireAuth>} />
        <Route path="/strategy/health-check" element={<RequireAuth><HealthCheckPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

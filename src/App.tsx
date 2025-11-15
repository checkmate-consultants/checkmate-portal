import { Navigate, Route, Routes } from 'react-router-dom'
import { SignUpPage } from './pages/SignUpPage.tsx'
import { SignInPage } from './pages/SignInPage.tsx'
import { WorkspacePage } from './pages/WorkspacePage.tsx'
import { CompanyOnboardingPage } from './pages/CompanyOnboardingPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/onboarding/company" element={<CompanyOnboardingPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}

export default App

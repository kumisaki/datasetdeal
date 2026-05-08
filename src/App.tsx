import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import { DashboardPage } from '@/pages/DashboardPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { RequirementDetailPage } from '@/pages/RequirementDetailPage'
import { RequirementEditPage } from '@/pages/RequirementEditPage'
import { RequirementNewPage } from '@/pages/RequirementNewPage'
import { RequirementsPage } from '@/pages/RequirementsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/requirements/:id" element={<RequirementDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requirements/new"
              element={
                <ProtectedRoute>
                  <RequirementNewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requirements/:id/edit"
              element={
                <ProtectedRoute>
                  <RequirementEditPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

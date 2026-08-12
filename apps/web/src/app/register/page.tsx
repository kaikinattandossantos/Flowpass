'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] to-[#1a3a52] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#0B1F3A] mb-4">Cadastro indisponível</h1>
        <p className="text-gray-600">
          O cadastro de empresas é realizado exclusivamente pela equipe FlowPass.
        </p>
      </div>
    </div>
  )
}

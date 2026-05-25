import React from 'react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Шапка */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">⚡ QuizTime</h1>
          <p className="text-gray-500 mt-1">Мои викторины</p>
        </div>

        {/* Действия */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            to="/dashboard/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            📥 Импортировать из файла
          </Link>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 bg-lime-500 opacity-50 cursor-not-allowed text-gray-900 text-sm font-semibold rounded-lg"
          >
            ➕ Создать викторину
          </button>
        </div>

        {/* Заглушка списка */}
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <div className="font-semibold text-gray-600 mb-2">Викторин пока нет</div>
          <div className="text-sm">
            Импортируйте из файла или создайте с нуля
          </div>
        </div>
      </div>
    </div>
  );
}

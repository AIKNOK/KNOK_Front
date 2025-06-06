import React, { useState } from 'react';
import { Input } from "../components/shared/Input";
import { Button } from "../components/shared/Button";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'book';
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  url: string;
}

export const Library: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'frontend', name: '프론트엔드' },
    { id: 'backend', name: '백엔드' },
    { id: 'devops', name: 'DevOps' },
    { id: 'database', name: '데이터베이스' },
    { id: 'architecture', name: '아키텍처' },
  ];

  const difficulties = [
    { id: 'all', name: '전체' },
    { id: 'beginner', name: '입문' },
    { id: 'intermediate', name: '중급' },
    { id: 'advanced', name: '고급' },
  ];

  const resources: Resource[] = [
    {
      id: '1',
      title: 'React 성능 최적화 가이드',
      description: 'React 애플리케이션의 성능을 최적화하는 다양한 방법을 알아봅니다.',
      type: 'article',
      category: 'frontend',
      difficulty: 'intermediate',
      tags: ['React', 'Performance', 'Optimization'],
      url: '#',
    },
    {
      id: '2',
      title: '시스템 디자인 인터뷰 완벽 가이드',
      description: '대규모 시스템 설계에 대한 인터뷰 준비 방법을 다룹니다.',
      type: 'book',
      category: 'architecture',
      difficulty: 'advanced',
      tags: ['System Design', 'Scalability', 'Architecture'],
      url: '#',
    },
    {
      id: '3',
      title: 'Docker와 Kubernetes 기초',
      description: '컨테이너화와 오케스트레이션의 기본 개념을 설명합니다.',
      type: 'video',
      category: 'devops',
      difficulty: 'beginner',
      tags: ['Docker', 'Kubernetes', 'Container'],
      url: '#',
    },
  ];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'article':
        return '📄';
      case 'video':
        return '🎥';
      case 'book':
        return '📚';
      default:
        return '📄';
    }
  };

  const getDifficultyColor = (difficulty: Resource['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600';
      case 'intermediate':
        return 'text-blue-600';
      case 'advanced':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            학습 자료 라이브러리
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            면접 준비에 도움이 되는 다양한 학습 자료를 제공합니다
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:space-x-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="키워드로 검색하기"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty.id} value={difficulty.id}>
                  {difficulty.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 자료 목록 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map(resource => (
            <div key={resource.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-2xl mr-2">{getResourceIcon(resource.type)}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">
                      {resource.title}
                    </h3>
                  </div>
                  <span className={`text-sm font-medium ${getDifficultyColor(resource.difficulty)}`}>
                    {difficulties.find(d => d.id === resource.difficulty)?.name}
                  </span>
                </div>
                <p className="mt-2 text-gray-600 text-sm">
                  {resource.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {resource.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    자료 보기
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              검색 결과가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, Users, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { memorialsApi } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import { mockTestimonials, mockCategories } from '../mock/data';

const Home = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [lovedOneName, setLovedOneName] = useState('');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [memorials, setMemorials] = useState([]);
  const [stats, setStats] = useState({ families: '288,277', visitors: '229,123,767', tributes: '6,027,951' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemorials();
  }, []);

  const loadMemorials = async () => {
    try {
      const response = await memorialsApi.list({ limit: 12 });
      setMemorials(response.data.memorials || []);
    } catch (error) {
      console.error('Failed to load memorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = (e) => {
    e.preventDefault();
    if (lovedOneName.trim()) {
      navigate('/create', { state: { name: lovedOneName } });
    }
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % mockTestimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + mockTestimonials.length) % mockTestimonials.length);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative bg-gradient-to-br from-blue-50 via-rose-50 to-purple-50 py-20 md:py-32"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-4">
              Reconnu par plus de 280 000 familles dans 47 pays
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Créer un site web commémoratif
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Préservez et partagez les souvenirs de vos proches
            </p>

            <form onSubmit={handleGetStarted} className="max-w-xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <div className="w-full sm:w-auto flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Je souhaite partager les souvenirs de
                  </label>
                  <Input
                    type="text"
                    placeholder="nom du défunt"
                    value={lovedOneName}
                    onChange={(e) => setLovedOneName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto mt-6"
                >
                  Commencer
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Recent Memorials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Hommages récents</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
              <div className="col-span-full text-center py-8">Chargement des mémoriaux...</div>
            ) : memorials.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">Aucun memoriaux</div>
            ) : (
              memorials.map((memorial) => (
                <Card
                  key={memorial._id}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  onClick={() => navigate(`/memorial/${memorial._id}`)}
                >
                  <CardContent className="p-0">
                    <div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden">
                      <img
                        src={memorial.image + '?memorial_id='+memorial._id}
                        alt={memorial.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                        {memorial.name}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {memorial.birth_date && new Date(memorial.birth_date).getFullYear()} - {memorial.death_date && new Date(memorial.death_date).getFullYear()}
                      </p>
                      {(memorial.birth_place || memorial.death_place) && (
                        <p className="text-xs text-gray-500 mt-1">{memorial.death_place || memorial.birth_place}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/browse')}>
              Parcourir tous les mémoriaux
            </Button>
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Notre communauté</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Users className="w-12 h-12 text-rose-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stats.families}</div>
              <div className="text-gray-600">Familles</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Heart className="w-12 h-12 text-rose-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stats.visitors}</div>
              <div className="text-gray-600">Visiteurs</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <MessageSquare className="w-12 h-12 text-rose-500" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">{stats.tributes}</div>
              <div className="text-gray-600">Hommages</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What Our Users Are Saying
          </h2>

          <div className="relative">
            <Card className="bg-gray-50">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <img
                    src={mockTestimonials[currentTestimonial].avatar}
                    alt={mockTestimonials[currentTestimonial].name}
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {mockTestimonials[currentTestimonial].text}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {mockTestimonials[currentTestimonial].name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {mockTestimonials[currentTestimonial].date}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center mt-6 space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={prevTestimonial}
                disabled={currentTestimonial === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextTestimonial}
                disabled={currentTestimonial === mockTestimonials.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Catégories en vedette
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {mockCategories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-md transition-shadow duration-300"
                onClick={() => navigate(`/browse?category=${category.id}`)}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="font-medium text-gray-900 text-sm mb-2 leading-7">{category.name}</h3>
                  <p className="text-xs text-gray-500">{category.count.toLocaleString()} memorials</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-rose-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Commencez dès aujourd'hui à partager vos souvenirs
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Créez un magnifique site web commémoratif pour votre proche
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/create')}
            className="text-lg px-8"
          >
            Créer un mémorial
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;

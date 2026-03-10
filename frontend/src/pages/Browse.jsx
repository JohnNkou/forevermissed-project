import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { memorialsApi } from '../utils/api';

const Browse = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemorials();
  }, [searchQuery]);

  const loadMemorials = async () => {
    try {
      const response = await memorialsApi.list({ search: searchQuery || undefined });
      setMemorials(response.data.memorials || []);
    } catch (error) {
      console.error('Failed to load memorials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Browse Memorials</h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover and honor the memories of loved ones
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-6 text-lg"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `Showing ${memorials.length} memorial${memorials.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Memorial Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {memorials.map((memorial) => (
            <Card
              key={memorial._id}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => navigate(`/memorial/${memorial._id}`)}
            >
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={memorial.image + `?memorial_id=${memorial._id}`}
                    alt={memorial.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-base text-nowrap mb-1 line-clamp-2">
                    {memorial.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {memorial.birth_date && new Date(memorial.birth_date).getFullYear()} - {memorial.death_date && new Date(memorial.death_date).getFullYear()}
                  </p>
                  {(memorial.birth_place || memorial.death_place) && (
                    <p className="text-xs text-gray-500 mt-1">{memorial.death_place || memorial.birth_place}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{memorial.tributes_count || 0} tributes</span>
                    <span>{memorial.gallery?.length || 0} photos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {!loading && memorials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No memorials found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;

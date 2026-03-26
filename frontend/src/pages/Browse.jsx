import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Navigation } from '../components/Navigation'
import MemorialCard from '../components/MemorialCard'
import { memorialsApi } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext'

const Browse = () => {
  const [searchQuery, setSearchQuery] = useState(''),
  [memorials, setMemorials] = useState([]),
  [loading, setLoading] = useState(true),
  [current, setCurrent] = useState(0),
  [total, setTotal] = useState(),
  navigation = useSettings().navigation,
  limit = navigation && navigation.limit[0];

  useEffect(() => {
    if(navigation){
      loadMemorials(0);
    }
  }, [searchQuery, navigation]);

  function onNavigation(newCurrent){
    loadMemorials(newCurrent).then(()=>{
      setCurrent(newCurrent);
    });
  }

  const loadMemorials = async (skip) => {
    try {
      const response = await memorialsApi.list({ search: searchQuery || undefined }, { limit, skip }),
      data = response.data;
      setMemorials(data.memorials || []);
      setTotal(response.data.total || 0);
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {memorials.map((memorial) => (
            <MemorialCard key={memorial._id} memorial={memorial} />
          ))}
        </div>

        <div className='mt-6'>
          <Navigation onNavigation={onNavigation} current={current} total={total} limit={limit} />
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

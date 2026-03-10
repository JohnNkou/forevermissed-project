import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from '../../hooks/use-toast';
import { memorialsApi } from '../../utils/api';
import { Trash2, Eye, Search } from 'lucide-react';

const Memorials = () => {
  const navigate = useNavigate();
  const [memorials, setMemorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMemorials();
  }, []);

  const loadMemorials = async () => {
    try {
      const response = await memorialsApi.list();
      setMemorials(response.data.memorials);
    } catch (error) {
      console.error('Failed to load memorials:', error);
      toast({ title: 'Error', description: 'Failed to load memorials', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this memorial?')) return;
    try {
      await memorialsApi.delete(id);
      toast({ title: 'Success', description: 'Memorial deleted successfully' });
      loadMemorials();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete memorial', variant: 'destructive' });
    }
  };

  const filteredMemorials = memorials.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.birth_place && m.birth_place.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.death_place && m.death_place.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Memorials Management</h2>
        <p className="text-gray-600">View and manage all memorials</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search memorials..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Memorials ({filteredMemorials.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemorials.map((memorial) => (
                <div key={memorial._id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gray-200">
                    {memorial.image && (
                      <img
                        src={memorial.image}
                        alt={memorial.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{memorial.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {memorial.birth_date && new Date(memorial.birth_date).getFullYear()} - 
                      {memorial.death_date && new Date(memorial.death_date).getFullYear()}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {memorial.tributes_count || 0} tributes
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/memorial/${memorial._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(memorial._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredMemorials.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No memorials found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Memorials;

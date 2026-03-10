import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserAbonnement } from '../contexts/UserAbonnementContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { memorialsApi, abonnementsApi } from '../utils/api';
import { User, FileText, LogOut, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import Abonnements from '../components/Abonnements.jsx'
import Payments from '../components/Payments.jsx'
import { PaymentProvider } from '../contexts/PaymentContext.jsx'
import { CartProvider } from '../contexts/CartContext.jsx'
import { useLoading } from '../contexts/LoadingContext'

const UserProfile = () => {
  const navigate = useNavigate(),
  { user, logout } = useAuth(),
  [memorials, setMemorials] = useState([]),
  { user_abonnement } = useUserAbonnement(),
  [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if(user.abonnement){
      loadUserMemorials();
    }
  }, [user, navigate]);

  const loadUserMemorials = async () => {
    try {
      const response = await memorialsApi.list();
      // Filter memorials created by this user (in a real app, backend should filter)
      setMemorials(response.data.memorials || []);
    } catch (error) {
      console.error('Failed to load memorials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div>
        <Tabs className='TabsRoot' defaultValue='accountTab'>
          <TabsList className='flex justify-center bg-transparant'>
            <TabsTrigger className='TabsTrigger text-xl' value='accountTab'>Compte</TabsTrigger>
            <TabsTrigger className='TabsTrigger text-xl' value='abonnementTab'>Abonnement</TabsTrigger>
            <TabsTrigger className='TabsTrigger text-xl' value='paymentTab'>Paiements</TabsTrigger>
          </TabsList>
          <TabsContent value='accountTab'>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Profile Header */}
              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{user.name}</h4>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500 capitalize mt-1">
                          Role: {user.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        Modifier
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Memorials Section */}
              { user_abonnement && 
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      <div className='flex items-center gap-3'>
                        <label className=''>Mes espaces souvenirs</label>
                        <span className='ms-3 text-sm'>
                          {memorials.length} / { user_abonnement.maxMemorial || '-' }
                        </span>
                        { memorials.length < user_abonnement.maxMemorial && 
                          <Button type='button' onClick={()=> navigate('/create')} className='ms-auto capitalize'>créer</Button>
                        }
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Chargement...</div>
                    ) : memorials.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4 normal-case">aucun espace de souvenir crée.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {memorials.slice(0, 6).map((memorial) => (
                          <div
                            key={memorial._id}
                            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => navigate(`/management/memorial/${memorial._id}`)}
                          >
                            <div className="aspect-video bg-gray-200">
                              {memorial.image && (
                                <img
                                  src={memorial.image + `?memorial_id=${memorial._id}`}
                                  alt={memorial.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-1">{memorial.name}</h3>
                              <p className="text-sm text-gray-600">
                                {memorial.birth_date && new Date(memorial.birth_date).getFullYear()} - 
                                {memorial.death_date && new Date(memorial.death_date).getFullYear()}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {memorial.tributes_count || 0} tributes
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              }
            </div>
          </TabsContent>
          <TabsContent value='abonnementTab'>
            <Abonnements />
          </TabsContent>
          <TabsContent value='paymentTab'>
            <Payments />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import AbonnementAdd from '../../components/AbonnementAdd'
import AbonnementView from '../../components/AbonnementView';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../hooks/use-toast';
import { abonnementsApi } from '../../utils/api';
import { Trash2, Edit, User } from 'lucide-react';

const Users = () => {
  const [abonnements, setAbonnements] = useState([]),
  [abonnement, setAbonnement] = useState(),
  [loading, setLoading] = useState(true),
  [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadAbonnements();
  }, []);

  const loadAbonnements = async () => {
    try {
      const response = await abonnementsApi.list();
      setAbonnements(response.data.abonnements);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({ title: 'Error', description: 'Failed to load abonnements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await abonnementsApi.delete(id);
      toast({ title: 'Success', description: 'User deleted successfully' });
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  function viewAbonnement(event){
    console.log("HONK");
    event.preventDefault();

    let target = event.target;


    for(let i=0; i < 6 && target && target.getAttribute; i++){
      let index = target.getAttribute('index'),
      action = target.getAttribute('action');

      if(action == 'edit'){
        setShowAdd(true);
      }

      if(index){
        setAbonnement(abonnements[index]);
        break;
      }
      else{
        target = target.parentNode;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className='flex justify-between'>
        <div>
          <h2 className="text-2xl font-bold">Abonnement Management</h2>
          <p className="text-gray-600">Manage abonnements</p>
        </div>
        <div>
          <Button onClick={()=> setShowAdd(true)}>Ajouter</Button>
        </div>
      </div>
      {showAdd && <AbonnementAdd abonnement={abonnement} onSuccess={loadAbonnements} onClose={()=> {setShowAdd(false); setAbonnement()}} />}
      {abonnement && !showAdd && <AbonnementView abonnement={abonnement} onClose={()=> setAbonnement(null)} />  }
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Abonnements ({abonnements.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div onClick={viewAbonnement} className="space-y-3 grid grid-cols-4 gap-2 items-end">
              {abonnements.map((abonnement,index) => (
                <div index={index} key={abonnement._id} className="flex cursor-pointer px-2 py-1 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {abonnement.type.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-nowrap capitalize mb-2 text-xl">
                        {abonnement.type}
                      </h4>
                      <p className="text-sm text-gray-600 font-semibold">{abonnement.price} {abonnement.currency}</p>
                    </div>
                    <div className='ms-auto flex'>
                      <a className='hidden' href='#'><Trash2 /></a>
                      <a action='edit' href='#'><Edit /></a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Users;

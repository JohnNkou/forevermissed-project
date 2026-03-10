import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import UserAdd from '../../components/UserAdd'
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../hooks/use-toast';
import { usersApi } from '../../utils/api';
import { Trash2, Shield, User } from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState([]),
  [loading, setLoading] = useState(true),
  [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersApi.list();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.delete(id);
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

  return (
    <div className="space-y-6">
      {showAdd && <UserAdd onSuccess={()=> loadUsers()} onClose={()=> setShowAdd(false)} />}
      <div className='flex justify-between'>
        <div>
          <h2 className="text-2xl font-bold">Users Management</h2>
          <p className="text-gray-600">Manage platform users and their roles</p>
        </div>
        <div>
          <Button onClick={()=> setShowAdd(true)}>Ajouter</Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {user.name}
                        {user.role === 'admin' ? (
                          <Badge className="bg-rose-500">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <User className="w-3 h-3 mr-1" />
                            User
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Joined: {new Date(user.date_created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(user._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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

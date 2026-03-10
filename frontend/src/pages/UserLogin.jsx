import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Otp from '../components/Otp.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { User } from 'lucide-react';

const UserLogin = () => {
  const navigate = useNavigate(),
  { login, register } = useAuth(),
  [isLogin, setIsLogin] = useState(true),
  [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  }),
  [loading, setLoading] = useState(false),
  [showOtp, setShowOtp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log('MUFI');

    try {
      let location = '/';

      if (isLogin) {
        const userData = await login(formData.email, formData.password);

        if(userData.role == 'admin'){
          location = '/admin/dashboard';
        }

        
        toast({ title: 'Login successful', description: `Welcome back, ${userData.name}!` });
      } else {
        const userData = await register(formData.name, formData.email, formData.password);

        if(userData.otp_required){
          return setShowOtp(true);
        }

        toast({ title: 'Registration successful', description: `Welcome, ${userData.name}!` });
      }



      navigate(location);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Authentication failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-rose-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {!showOtp ? 
                isLogin ? 'Connexion' : 'Créer un compte'
                : 'OTP'}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {!showOtp ? 
              isLogin ? 'Connectez-vous pour gérer vos mémoriaux' : 'Joignez notre communauté'
              : "Veuillez entrer l'otp"
            }
          </p>
          <p className='text-sm text-gray-600 mt-2'>
            {showOtp && 'OTP'  }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!showOtp ? <>
              {!isLogin && (
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-2"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Traitement...' : isLogin ? 'Connexion' : 'Créer un compte'}
              </Button>
              </>
              : <Otp />
            }
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setShowOtp(false); }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              {isLogin ? "Vous n'avez pas de compte ? Inscrivez-vous" : 'Déjà inscrit ? Connexion'}
            </button>
          </div>

          <div className="mt-4 text-center space-y-2">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 block">
              Accueil
            </Link>
            {/*<Link to="/admin/login" className="text-xs text-gray-400 hover:text-gray-600 block">
              Admin Login
            </Link>*/}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserLogin;

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { memorialsApi } from '../utils/api';
import { resizeWidth } from '../utils/img'
import { useLoading } from '../contexts/LoadingContext'

const CreateMemorial = () => {
  const location = useLocation(),
  navigate = useNavigate(),
  [formData, setFormData] = useState({
    name: location.state?.name || '',
    birth_date: '',
    death_date: '',
    birth_date: '',
    death_date: '',
    biography: '',
    obituary: ''
  }),
  loader = useLoading();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  function onProgress(event){
    let total = event.total,
    loaded = event.loaded,
    percent = Math.floor((loaded / total) * 100);

    loader.setPercent(percent);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.birth_date || !formData.death_date) {
      toast({
        title: 'Information manquante',
        description: 'Veuillez remplir toute les informations',
        variant: 'destructive'
      });
      return;
    }

    try {
      loader.showMessage("Création de l'espace")

      const f = new FormData(event.target);

      let response,image,background_image,files;

      image = f.get('image');
      background_image = f.get('background_image');

      console.log("Image size", image.size);
      console.log("Background image size", background_image.size);

      try{
        files = await Promise.all([resizeWidth(image,300, image.size), resizeWidth(background_image,1000, background_image.size)]);

        f.set('image', files[0]);
        f.set('background_image', files[1]);

        console.log("Reduce file size", files[0].size, files[1].size);
      }
      catch(error){
        console.error("Error resizing files",error);
      }

      response = await memorialsApi.create(f, onProgress);

      toast({
        title: 'Esapce crée',
        description: 'Votre espace a été crée'
      });

      // Navigate to the memorial page
      setTimeout(() => {
        navigate(`/memorial/${response.data.id}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to create memorial:', error);
      toast({
        title: 'Error',
        description: "Echec lors de la création de l'espace. Veuillez réessayer",
        variant: 'destructive'
      });
    }

    loader.showMessage('');
    loader.setPercent(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-rose-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Créer un espace souvenir</h1>
          <p className="text-xl text-gray-600">
            Célébrez sa vie en créant un mémorial en ligne unique.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle><h3>À propos du mémorial</h3></CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name">nom complet *</label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  required
                  className="mt-2"
                />
              </div>

              {/* Birth Date and Place */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="birthDate">date de naissance *</label>
                  <Input
                    id="birthDate"
                    name="birth_date"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="birthPlace">lieu de naissance *</label>
                  <Input
                    id="birthPlace"
                    name="birth_place"
                    value={formData.birthPlace}
                    onChange={handleChange}
                    placeholder="City, State"
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Death Date and Place */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className='letter-cap' htmlFor="deathDate">date de décès *</label>
                  <Input
                    id="deathDate"
                    name="death_date"
                    type="date"
                    value={formData.deathDate}
                    onChange={handleChange}
                    required
                    className="mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="deathPlace">lieu de décès</label>
                  <Input
                    id="death_place"
                    name="death_place"
                    value={formData.deathPlace}
                    onChange={handleChange}
                    placeholder="City, State"
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Biography */}
              <div>
                <label htmlFor="biography">biographie</label>
                <Textarea
                  id="biography"
                  name="biography"
                  value={formData.biography}
                  onChange={handleChange}
                  placeholder="Share about their life, accomplishments, and what made them special..."
                  rows={5}
                  className="mt-2"
                />
              </div>

              {/* Obituary */}
              <div>
                <label htmlFor="obituary">nécrologie</label>
                <Textarea
                  id="obituary"
                  name="obituary"
                  value={formData.obituary}
                  onChange={handleChange}
                  placeholder="Enter the obituary text..."
                  rows={5}
                  className="mt-2"
                />
              </div>

              {/* Pictures */}
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label htmlFor='image'>Photo</label>
                  <Input name='image' className='mt-2' type='file' />
                </div>
                <div>
                  <label htmlFor='background_image'>Image de fond</label>
                  <Input name='background_image' className='mt-2' type='file' />
                </div>
              </div>

              {/* Music de fond */}
              <div className='grid grid-cols-2 gap-2'>
                <div className=''>
                  <label htmlFor='background_sound'>Music</label>
                  <Input name='background_sound' accept=".mp3, .m4a" className='mt-2' type='file' />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" size="lg" className="flex-1 capitalize">
                  créer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateMemorial;

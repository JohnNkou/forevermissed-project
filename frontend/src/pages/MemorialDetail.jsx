import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Heart, MessageSquare, Share2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { toast } from '../hooks/use-toast';
import { memorialsApi, tributesApi } from '../utils/api';

const MemorialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [memorial, setMemorial] = useState(null);
  const [newTribute, setNewTribute] = useState('');
  const [tributeAuthor, setTributeAuthor] = useState('');

  useEffect(() => {
    loadMemorial();
  }, [id]);

  const loadMemorial = async () => {
    try {
      const [memorialRes, tributesRes] = await Promise.all([
        memorialsApi.get(id),
        tributesApi.list(id)
      ]);
      
      setMemorial({
        ...memorialRes.data,
        tributes: tributesRes.data
      });
    } catch (error) {
      console.error('Failed to load memorial:', error);
      toast({
        title: 'Memorial Not Found',
        description: 'The memorial you are looking for does not exist.',
        variant: 'destructive'
      });
      navigate('/browse');
    }
  };

  const handleAddTribute = async (e) => {
    e.preventDefault();
    if (!newTribute.trim() || !tributeAuthor.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name and tribute message.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await tributesApi.create(id, {
        author_name: tributeAuthor,
        text: newTribute
      });

      // Reload tributes
      const tributesRes = await tributesApi.list(id);
      setMemorial(prev => ({
        ...prev,
        tributes: tributesRes.data
      }));

      setNewTribute('');
      setTributeAuthor('');

      toast({
        title: 'Tribute Added',
        description: 'Your tribute has been added successfully.'
      });
    } catch (error) {
      console.error('Failed to add tribute:', error);
      toast({
        title: 'Error',
        description: 'Failed to add tribute. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Memorial for ${memorial.name}`,
        text: `View the memorial for ${memorial.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Memorial link copied to clipboard.'
      });
    }
  };

  if (!memorial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading memorial...</p>
        </div>
      </div>
    );
  }

  const birthYear = memorial.birth_date ? new Date(memorial.birth_date).getFullYear() : '';
  const deathYear = memorial.death_date ? new Date(memorial.death_date).getFullYear() : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-100 via-rose-100 to-purple-100 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
              <img
                src={memorial.image}
                alt={memorial.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{memorial.name}</h1>
              <div className="flex flex-col md:flex-row gap-4 text-gray-600 mb-4 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{birthYear} - {deathYear}</span>
                </div>
                {(memorial.death_place || memorial.birth_place) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{memorial.death_place || memorial.birth_place}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-4 justify-center md:justify-start">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Biography */}
            {(memorial.bio || memorial.biography) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Biography</h2>
                  <p className="text-gray-700 leading-relaxed">
                    {memorial.bio || memorial.biography}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Obituary */}
            {memorial.obituary && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Obituary</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {memorial.obituary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Photo Gallery */}
            {memorial.gallery && memorial.gallery.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-6 h-6" />
                    Photo Gallery
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {memorial.gallery.map((photo, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-200"
                      >
                        <img
                          src={photo}
                          alt={`Memory ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tributes */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Tributes ({memorial.tributes?.length || 0})
                </h2>

                {/* Add Tribute Form */}
                <form onSubmit={handleAddTribute} className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-4">Leave a Tribute</h3>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={tributeAuthor}
                    onChange={(e) => setTributeAuthor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <Textarea
                    placeholder="Share your memories and condolences..."
                    value={newTribute}
                    onChange={(e) => setNewTribute(e.target.value)}
                    rows={4}
                    className="mb-3"
                  />
                  <Button type="submit" size="sm">
                    <Heart className="w-4 h-4 mr-2" />
                    Post Tribute
                  </Button>
                </form>

                {/* Tributes List */}
                <div className="space-y-6">
                  {memorial.tributes && memorial.tributes.length > 0 ? (
                    memorial.tributes.map((tribute) => (
                      <div key={tribute.id} className="flex gap-4 pb-6 border-b border-gray-200 last:border-b-0">
                        <img
                          src={tribute.avatar}
                          alt={tribute.author}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{tribute.author}</span>
                            <span className="text-sm text-gray-500">{tribute.date}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{tribute.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No tributes yet. Be the first to share your memories.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Memorial Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tributes</span>
                    <span className="font-semibold text-gray-900">{memorial.tributes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos</span>
                    <span className="font-semibold text-gray-900">{memorial.gallery?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Share this Memorial</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share this memorial with family and friends to keep the memory alive.
                </p>
                <Button onClick={handleShare} className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Memorial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemorialDetail;

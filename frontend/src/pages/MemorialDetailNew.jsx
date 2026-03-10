import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Heart, MessageSquare, Share2, Play, Pause, Volume2, Eye, User as UserIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from '../hooks/use-toast';
import { memorialsApi, tributesApi } from '../utils/api';
import { MemorialResource, ResourceActionElement } from '../components/MemorialManagement'
import { AudioPlayer, AudioControl } from '../components/AudioPlayer'
import { useViewer } from '../contexts/ResourceViewerContext'

const MemorialDetailNew = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const audioRef = useRef(null);
  
  const [memorial, setMemorial] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  
  // Tribute form
  const [newTribute, setNewTribute] = useState('');
  const [tributeAuthor, setTributeAuthor] = useState('');
  const { startViewing } = useViewer();

  useEffect(() => {
    loadMemorial();
  }, [id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function viewResource(event){
    event.preventDefault();

    let target = event.target,
    parent = target.parentNode,
    index = parent.getAttribute('index'),
    type;

    for(let i=0; i < 5 && !index ; i++){
      parent = parent.parentNode;
      index = parent.getAttribute('index');
      type = parent.getAttribute('type');
    }

    if(index && type){
      let resources;

      if(type == 'video'){
        resources = memorial.videos;
      }
      else if(type == 'picture'){
        resources = memorial.gallery
      }
      else{
        throw Error("Unknwon type: "+ type);
      }


      startViewing({ resources, index, type, id: memorial._id });
    }
  }

  const loadMemorial = async () => {
    try {
      const [memorialRes, tributesRes] = await Promise.all([
        memorialsApi.get(id),
        tributesApi.list(id)
      ]);

      memorialRes.data.birth_date = new Date(memorialRes.data.birth_date);
      memorialRes.data.death_date = new Date(memorialRes.data.death_date);
      
      const memorialData = {
        ...memorialRes.data,
        tributes: tributesRes.data
      };
      
      setMemorial(memorialData);
      
      // Increment view count
      await memorialsApi.get(id); // This would update the view count on backend
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

      const tributesRes = await tributesApi.list(id);
      setMemorial(prev => ({
        ...prev,
        tributes: tributesRes.data
      }));

      setNewTribute('');
      setTributeAuthor('');

      toast({
        title: 'Tribute Submitted',
        description: 'Your tribute will be visible after approval.'
      });
    } catch (error) {
      console.error('Failed to add tribute:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit tribute. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
  const background_image = memorial.background_image && memorial.background_image + `?memorial_id=${memorial._id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {/* Hero Section with Background */}
      <div 
        className="relative h-[500px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${background_image || 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200'})`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {/* Profile Photo */}
            <div className="mb-8 inline-block">
              <div className="relative">
                <div className="w-48 h-64 bg-white shadow-2xl rounded-lg overflow-hidden border-8 border-white">
                  <img
                    src={memorial.image + `?memorial_id=${memorial._id}`}
                    alt={memorial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            
            {/* Name and Dates */}
            <h1 className="text-5xl md:text-6xl font-serif text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {memorial.name}
            </h1>
            <p className="text-3xl text-gray-600 mb-6">
              {birthYear} - {deathYear}
            </p>
            <p className="text-xl italic text-purple-800 font-serif">
              In memory of a beloved {memorial.custom_fields?.relation || 'soul'}
            </p>
          </div>
        </div>

        {/* Audio Player - Top Right */}
        {memorial.background_sound && <AudioControl autoplay='true' src={memorial.background_sound + `?memorial_id=${memorial._id}`} loop className='hidden' />}

        {/* Share Button - Top Left */}
        <button
          onClick={handleShare}
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:scale-110 transition-transform"
        >
          <Share2 className="w-5 h-5 text-purple-700" />
        </button>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <Card className="shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="about" 
                  className="px-8 py-4 text-lg font-serif data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border-b-4 data-[state=active]:border-primary"
                >
                  A PROPOS
                </TabsTrigger>
                <TabsTrigger 
                  value="life"
                  className="px-8 hidden py-4 text-lg font-serif data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border-b-4 data-[state=active]:border-primary"
                >
                  LIFE
                </TabsTrigger>
                <TabsTrigger 
                  value="gallery"
                  className="px-8 py-4 text-lg font-serif data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border-b-4 data-[state=active]:border-primary"
                >
                  GALERIE
                </TabsTrigger>
                <TabsTrigger 
                  value="stories"
                  className="px-8 py-4 text-lg font-serif data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:border-b-4 data-[state=active]:border-primary"
                >
                  HOMMAGES
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
              {/* ABOUT TAB */}
              <TabsContent value="about" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {/* Quotes Section */}
                    {memorial.quotes && memorial.quotes.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-serif text-purple-900 mb-6 flex items-center gap-2">
                          <span className="text-6xl text-purple-300">"</span>
                          Favorite Quotes
                        </h2>
                        {memorial.quotes.map((quote, index) => (
                          <blockquote key={index} className="mb-6 pl-6 border-l-4 border-purple-300">
                            <p className="text-lg italic text-gray-700 font-serif leading-relaxed">
                              {quote}
                            </p>
                          </blockquote>
                        ))}
                      </div>
                    )}

                    <div className='flex gap-2 text-center'>
                      <div className='flex flex-col shadow-lg border p-6 rounded-lg'>
                        <p className='text-base text-gray-500'>Naissance</p> 
                        <p className='font-semibold capitalize'>
                          {memorial['birth_date'].toLocaleDateString('fr-FR', { month:'long', weekday:'short', day:'numeric', year:'numeric' })}</p>
                        <p className='text-gray-500'>{memorial['birth_place']}</p>
                      </div>
                      <div className='flex flex-col shadow-lg border p-6 rounded-lg'>
                        <p className='text-base text-gray-500'>Deces </p>
                        <p className='font-semibold capitalize'>{memorial['death_date'].toLocaleDateString('fr-FR', { month:'long', weekday:'long', day:'numeric', year:'numeric' })}</p>
                        <p className='text-gray-500'>{memorial['death_place']}</p> 
                      </div>
                    </div>

                    {/* Life Summary */}
                    {memorial.biography && (
                      <div>
                        <h2 className="text-2xl font-serif text-primary mb-4">Biographie</h2>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                          {memorial.biography}
                        </p>
                      </div>
                    )}

                    {/* Circumstances */}
                    {memorial.obituary && (
                      <div>
                        <h2 className="text-2xl font-serif text-primary mb-4">Nécrologie</h2>
                        <p className="text-gray-700 leading-relaxed">
                          {memorial.obituary}
                        </p>
                      </div>
                    )}

                    {/* Tributes Section */}
                    <div className="mt-8">
                      <h2 className="text-2xl font-serif text-primary mb-6">Laisser un hommage</h2>
                      
                      {/* Add Tribute Form */}
                      <form onSubmit={handleAddTribute} className="mb-8 p-6 bg-secondary rounded-lg border-2">
                        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                          <Heart className="w-5 h-5 text-rose-500" />
                          Laisser un hommage
                        </h3>
                        <Input
                          type="text"
                          placeholder="Nom"
                          value={tributeAuthor}
                          onChange={(e) => setTributeAuthor(e.target.value)}
                          className="mb-3 bg-white"
                        />
                        <Textarea
                          placeholder="Racontez un souvenir, exprimez vos condoléances..."
                          value={newTribute}
                          onChange={(e) => setNewTribute(e.target.value)}
                          rows={4}
                          className="mb-3 bg-white"
                        />
                        <Button type="submit" className="bg-purple-700 text-white hover:bg-purple-800">
                          Publier
                        </Button>
                      </form>

                      {/* Tributes List */}
                      <div className="space-y-6">
                        {memorial.tributes && memorial.tributes.length > 0 ? (
                          memorial.tributes.map((tribute) => (
                            <div key={tribute._id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-400">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-semibold">
                                    {tribute.author_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-purple-900">{tribute.author_name}</span>
                                    <span className="text-sm text-gray-500">{new Date(tribute.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-gray-700 leading-relaxed">{tribute.text}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-8 italic">
                            L'espace est encore vide. Soyez le premier à honorer sa mémoire.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    {/* Recent Updates */}
                    <Card className="bg-secondary">
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-4">Recent updates</h3>
                        <div className="space-y-3">
                          {memorial.updates && memorial.updates.map((update, index) => (
                            <div key={index} className="text-sm">
                              <p className="text-purple-800 font-medium">{update.date}</p>
                              <p className="text-gray-700">
                                <span className="text-purple-700 font-semibold">{update.author}</span> {update.action}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* View Counter */}
                    <Card className="bg-secondary">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <Eye className="w-8 h-8" />
                          <div>
                            <p className="text-3xl font-bold text-purple-900">{memorial.view_count?.toLocaleString()}</p>
                            <p className="text-sm">Views</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Memorial Administrator */}
                    {memorial.family_members && memorial.family_members.length > 0 && (
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-purple-900 mb-4">This website is administered by:</h3>
                          {memorial.family_members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 mb-3">
                              {member.photo ? (
                                <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-full" />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-purple-300 flex items-center justify-center">
                                  <UserIcon className="w-6 h-6 text-purple-700" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-purple-900">{member.name}</p>
                                <p className="text-sm text-gray-600">{member.relationship}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* LIFE TAB */}
              <TabsContent value="life" className="mt-0">
                <div className="space-y-8">
                  <h2 className="text-3xl font-serif text-purple-900 mb-6">Life Journey</h2>
                  
                  {/* Family Members */}
                  {memorial.family_members && memorial.family_members.length > 0 && (
                    <div className="mb-12">
                      <h3 className="text-2xl font-serif text-purple-800 mb-6">Family</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {memorial.family_members.map((member) => (
                          <div key={member.id} className="text-center">
                            <div className="w-32 h-32 mx-auto mb-3 rounded-full overflow-hidden border-4 border-purple-300 shadow-lg">
                              {member.photo ? (
                                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center">
                                  <UserIcon className="w-12 h-12 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="font-semibold text-purple-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.relationship}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Life Timeline */}
                  {memorial.life_events && memorial.life_events.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-serif text-purple-800 mb-6">Timeline</h3>
                      <div className="relative border-l-4 border-purple-300 pl-8 space-y-8">
                        {memorial.life_events.map((event) => (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-10 w-6 h-6 rounded-full bg-purple-600 border-4 border-white"></div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                              <p className="text-purple-700 font-bold mb-2">{event.date}</p>
                              <h4 className="text-xl font-semibold text-purple-900 mb-3">{event.title}</h4>
                              <p className="text-gray-700 leading-relaxed mb-4">{event.description}</p>
                              {event.images && event.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                  {event.images.map((img, idx) => (
                                    <img key={idx} src={img} alt={event.title} className="rounded-lg w-full h-48 object-cover" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* GALLERY TAB */}
              <TabsContent value="gallery" className="mt-0">
                <Tabs defaultValue="photos" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="photos"><h3>Photos</h3></TabsTrigger>
                    <TabsTrigger value="videos"><h3>Videos</h3></TabsTrigger>
                  </TabsList>

                  <TabsContent value="photos">
                    <div className="text-center">
                      <MemorialResource  id={memorial._id} showAdd={false} resources={memorial.gallery} title='Photos' type='picture' actionClickHandler={viewResource} actionElement={<ResourceActionElement />} />
                    </div>
                  </TabsContent>

                  <TabsContent value="videos">
                    <div className="text-center">
                      <MemorialResource id={memorial._id} showAdd={false} resources={memorial.videos} title='Videos' type='video' actionElement={<ResourceActionElement />} actionClickHandler={viewResource} />
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* STORIES TAB */}
              <TabsContent value="stories" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-3xl font-serif text-primary mb-6">Récits et souvenirs</h2>
                  
                  {memorial.tributes && memorial.tributes.length > 0 ? (
                    memorial.tributes.map((tribute) => (
                      <Card key={tribute._id} className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xl font-semibold">
                                {tribute.author_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-bold text-purple-900 text-base">{tribute.author_name}</h4>
                                  <p className="text-sm text-gray-600">{new Date(tribute.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                              </div>
                              <div className="prose max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                  {tribute.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-purple-300 mx-auto mb-4" />
                      <p className="text-gray-600">No stories shared yet</p>
                      <p className="text-sm text-gray-500 mt-2">Be the first to share a memory</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* Spacer */}
      <div className="h-20"></div>
    </div>
  );
};

export default MemorialDetailNew;

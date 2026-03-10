import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';
import { settingsApi } from '../../utils/api';
import { useSettings } from '../../contexts/SettingsContext';
import { Save } from 'lucide-react';

const SiteSettings = () => {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState({
    logo: { url: '', text: 'ForeverMissed' },
    colors: {
      primary: '#f43f5e',
      secondary: '#8b5cf6',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#111827'
    },
    language: 'en',
    site_title: 'ForeverMissed',
    trust_badge: 'Trusted by 280,000+ families across 47 countries',
    footer_text: '© 2025 ForeverMissed. All rights reserved.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.getSite();
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load site settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateSite(settings);
      refreshSettings();
      toast({
        title: 'Success',
        description: 'Site settings saved successfully'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save site settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  if (loading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Site Settings</h2>
          <p className="text-gray-600">Customize your website's appearance and content</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Logo & Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="logo-text">Logo Text</Label>
            <Input
              id="logo-text"
              value={settings.logo.text}
              onChange={(e) => handleNestedChange('logo', 'text', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="logo-url">Logo Image URL (optional)</Label>
            <Input
              id="logo-url"
              value={settings.logo.url || ''}
              onChange={(e) => handleNestedChange('logo', 'url', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.colors.primary}
                  onChange={(e) => handleNestedChange('colors', 'primary', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.colors.primary}
                  onChange={(e) => handleNestedChange('colors', 'primary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.colors.secondary}
                  onChange={(e) => handleNestedChange('colors', 'secondary', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.colors.secondary}
                  onChange={(e) => handleNestedChange('colors', 'secondary', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={settings.colors.accent}
                  onChange={(e) => handleNestedChange('colors', 'accent', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.colors.accent}
                  onChange={(e) => handleNestedChange('colors', 'accent', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={settings.colors.background}
                  onChange={(e) => handleNestedChange('colors', 'background', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.colors.background}
                  onChange={(e) => handleNestedChange('colors', 'background', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="text-color"
                  type="color"
                  value={settings.colors.text}
                  onChange={(e) => handleNestedChange('colors', 'text', e.target.value)}
                  className="w-20"
                />
                <Input
                  value={settings.colors.text}
                  onChange={(e) => handleNestedChange('colors', 'text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Content */}
      <Card>
        <CardHeader>
          <CardTitle>Site Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="site-title">Site Title</Label>
            <Input
              id="site-title"
              value={settings.site_title}
              onChange={(e) => handleChange('site_title', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>
          <div>
            <Label htmlFor="trust-badge">Trust Badge Text</Label>
            <Input
              id="trust-badge"
              value={settings.trust_badge}
              onChange={(e) => handleChange('trust_badge', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="footer-text">Footer Text</Label>
            <Input
              id="footer-text"
              value={settings.footer_text}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteSettings;
